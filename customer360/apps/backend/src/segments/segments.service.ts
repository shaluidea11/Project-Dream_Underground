import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Segment } from '../entities/segment.entity';
import { SegmentMembership } from '../entities/segment-membership.entity';
import { Customer } from '../entities/customer.entity';
import { SegmentationAgentService, FilterAST, FilterCondition } from '../agents/segmentation-agent.service';

// Arch.md §5.5 — canonical whitelists
const COLUMN_WHITELIST: Record<string, string> = {
  totalSpend:       'c.total_spend',
  orderCount:       'c.order_count',
  engagementScore:  'c.engagement_score',
  city:             'c.city',
  state:            'c.state',
  lastOrderAt:      'c.last_order_at',
  preferredChannel: 'c.preferred_channel',
};

const SAFE_OPERATORS: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  eq: '=',
  neq: '!=',
};

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filterDefinition: FilterAST;
  nlQuery?: string;
}

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
    @InjectRepository(SegmentMembership)
    private readonly membershipRepo: Repository<SegmentMembership>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectQueue('segment.compute')
    private readonly computeQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly segmentationAgent: SegmentationAgentService,
  ) {}

  async create(dto: CreateSegmentDto, userId: string): Promise<Segment> {
    this.validateAST(dto.filterDefinition);

    const segment = new Segment();
    segment.name = dto.name;
    segment.description = (dto.description || null) as any;
    segment.filterDefinition = dto.filterDefinition;
    segment.nlQuery = (dto.nlQuery || null) as any;
    segment.createdBy = userId;

    const saved = await this.segmentRepo.save(segment);

    // Enqueue background computation
    await this.computeQueue.add('compute', { segmentId: saved.id });

    return saved;
  }

  async findAll() {
    return this.segmentRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Segment> {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) throw new NotFoundException(`Segment ${id} not found`);
    return segment;
  }

  async getMembers(id: string, page = 1, limit = 20) {
    const segment = await this.findOne(id);

    const [items, total] = await this.membershipRepo
      .createQueryBuilder('sm')
      .innerJoinAndSelect('sm.customer', 'customer')
      .where('sm.segmentId = :segmentId', { segmentId: id })
      .orderBy('sm.addedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      segment,
      items: items.map((sm) => sm.customer),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * AI-generate: NL query → AST → preview count
   */
  async aiGenerate(nlQuery: string) {
    const ast = await this.segmentationAgent.generateAST(nlQuery);
    this.validateAST(ast);

    const count = await this.executeFilterCount(ast);
    return { filterDefinition: ast, previewCount: count, nlQuery };
  }

  /**
   * Recompute segment membership via BullMQ
   */
  async recompute(id: string) {
    const segment = await this.findOne(id);
    await this.computeQueue.add('compute', { segmentId: segment.id });
    return { message: 'Recompute job enqueued', segmentId: id };
  }

  /**
   * Execute a FilterAST and return matching customer count.
   * Used for preview before saving.
   */
  async executeFilterCount(ast: FilterAST): Promise<number> {
    this.validateAST(ast);
    const qb = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('customers', 'c');

    this.applyASTToQueryBuilder(qb, ast);
    const result = await qb.getRawOne();
    return parseInt(result.count, 10);
  }

  /**
   * Execute a FilterAST and return matching customer IDs.
   * Used by the background worker.
   */
  async executeFilterIds(ast: FilterAST): Promise<string[]> {
    this.validateAST(ast);
    const qb = this.dataSource
      .createQueryBuilder()
      .select('c.id', 'id')
      .from('customers', 'c');

    this.applyASTToQueryBuilder(qb, ast);
    const rows = await qb.getRawMany();
    return rows.map((r) => r.id);
  }

  /**
   * Validate AST against whitelists. Throws BadRequestException on violation.
   */
  private validateAST(ast: FilterAST): void {
    if (!ast || !ast.logic || !Array.isArray(ast.conditions)) {
      throw new BadRequestException('Invalid FilterAST: must have logic and conditions');
    }
    if (!['AND', 'OR'].includes(ast.logic)) {
      throw new BadRequestException(`Invalid logic: ${ast.logic}. Must be AND or OR.`);
    }
    if (ast.conditions.length === 0) {
      throw new BadRequestException('FilterAST must have at least one condition');
    }
    for (const cond of ast.conditions) {
      if (!COLUMN_WHITELIST[cond.field]) {
        throw new BadRequestException(`Unsupported filter field: "${cond.field}"`);
      }
      if (!SAFE_OPERATORS[cond.op]) {
        throw new BadRequestException(`Unsupported filter operator: "${cond.op}"`);
      }
    }
  }

  /**
   * Apply validated FilterAST conditions to a TypeORM query builder.
   * Security: all values go through parameterized queries. Column and operator
   * are resolved from hardcoded whitelists — never user input.
   */
  private applyASTToQueryBuilder(
    qb: SelectQueryBuilder<any>,
    ast: FilterAST,
  ): void {
    const method = ast.logic === 'OR' ? 'orWhere' : 'andWhere';

    ast.conditions.forEach((cond, idx) => {
      const col = COLUMN_WHITELIST[cond.field];
      const op = SAFE_OPERATORS[cond.op];
      // col and op are guaranteed safe — validated above
      const paramKey = `param_${idx}`;

      if (idx === 0) {
        qb.where(`${col} ${op} :${paramKey}`, { [paramKey]: cond.value });
      } else {
        qb[method](`${col} ${op} :${paramKey}`, { [paramKey]: cond.value });
      }
    });
  }
}
