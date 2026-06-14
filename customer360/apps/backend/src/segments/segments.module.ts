import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Segment } from '../entities/segment.entity';
import { SegmentMembership } from '../entities/segment-membership.entity';
import { Customer } from '../entities/customer.entity';
import { AgentsModule } from '../agents/agents.module';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { SegmentWorker } from './segment.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Segment, SegmentMembership, Customer]),
    BullModule.registerQueue({ name: 'segment.compute' }),
    AgentsModule,
  ],
  controllers: [SegmentsController],
  providers: [SegmentsService, SegmentWorker],
  exports: [SegmentsService],
})
export class SegmentsModule {}
