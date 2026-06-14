import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Campaign } from '../entities/campaign.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';
import { Segment } from '../entities/segment.entity';
import { Customer } from '../entities/customer.entity';
import { Communication } from '../entities/communication.entity';
import { SegmentsModule } from '../segments/segments.module';
import { AgentsModule } from '../agents/agents.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignSendWorker } from './campaign.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Campaign,
      CampaignAnalytics,
      Segment,
      Customer,
      Communication,
    ]),
    BullModule.registerQueue({ name: 'campaign.send' }),
    SegmentsModule,
    AgentsModule,
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignSendWorker],
  exports: [CampaignsService],
})
export class CampaignsModule {}
