import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerIntelligenceService } from '../agents/customer-intelligence.service';

export interface GetCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly intelligenceService: CustomerIntelligenceService,
  ) {}

  async findAll(params: GetCustomersParams) {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;

    const skip = (page - 1) * limit;

    const query = this.customerRepo.createQueryBuilder('customer');

    if (search) {
      query.where(
        'customer.canonicalName ILIKE :search OR customer.email ILIKE :search',
        { search: `%${search}%` },
      );
    }

    // Default sorting validation
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'totalSpend',
      'engagementScore',
      'lastOrderAt',
      'canonicalName',
    ];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    query.orderBy(`customer.${orderField}`, sortOrder);
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['orders', 'communications', 'segmentMemberships'],
      order: {
        orders: { orderedAt: 'DESC' },
        communications: { createdAt: 'DESC' },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  /**
   * Re-profile a customer using the Intelligence Agent
   */
  async profileCustomer(id: string): Promise<Customer> {
    const customer = await this.findOne(id);

    const stats = {
      orderCount: customer.orderCount,
      totalSpend: customer.totalSpend,
      lastOrderAt: customer.lastOrderAt,
      createdAt: customer.createdAt,
    };

    const result = await this.intelligenceService.profileCustomer(
      stats,
      customer.preferredChannel,
    );

    await this.customerRepo.update(id, {
      engagementScore: result.engagementScore,
      lifetimeValue: result.lifetimeValue,
      tags: result.tags,
      preferredChannel: result.preferredChannel,
    });

    return this.findOne(id);
  }
}
