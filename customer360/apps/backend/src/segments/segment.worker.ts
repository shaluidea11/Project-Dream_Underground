import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { Segment } from '../entities/segment.entity';
import { SegmentsService } from './segments.service';

@Processor('segment.compute')
export class SegmentWorker extends WorkerHost {
  private readonly logger = new Logger(SegmentWorker.name);

  constructor(
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
    private readonly dataSource: DataSource,
    private readonly segmentsService: SegmentsService,
  ) {
    super();
  }

  async process(job: Job<{ segmentId: string }>): Promise<void> {
    const { segmentId } = job.data;
    this.logger.log(`Computing segment ${segmentId}...`);

    const segment = await this.segmentRepo.findOne({ where: { id: segmentId } });
    if (!segment) {
      this.logger.warn(`Segment ${segmentId} not found, skipping`);
      return;
    }

    const ast = segment.filterDefinition as any;
    if (!ast || !ast.conditions) {
      this.logger.warn(`Segment ${segmentId} has no filter definition`);
      return;
    }

    // Get matching customer IDs
    const customerIds = await this.segmentsService.executeFilterIds(ast);

    // Clear existing memberships and insert new ones in a transaction
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM segment_memberships WHERE segment_id = $1`,
        [segmentId],
      );

      if (customerIds.length > 0) {
        // Batch insert memberships
        const values = customerIds
          .map((_, i) => `($1, $${i + 2}, NOW())`)
          .join(', ');
        const params = [segmentId, ...customerIds];
        await manager.query(
          `INSERT INTO segment_memberships (segment_id, customer_id, added_at) VALUES ${values}`,
          params,
        );
      }

      // Update segment counts
      await manager.query(
        `UPDATE segments SET customer_count = $1, last_computed_at = NOW() WHERE id = $2`,
        [customerIds.length, segmentId],
      );
    });

    this.logger.log(
      `Segment ${segmentId} computed: ${customerIds.length} members`,
    );
  }
}
