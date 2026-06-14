import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CustomerIntelligenceService } from './customer-intelligence.service';
import { SegmentationAgentService } from './segmentation-agent.service';
import { CampaignAgentService } from './campaign-agent.service';
import { TrendAgentService } from './trend-agent.service';
import { AnalyticsAgentService } from './analytics-agent.service';
import { AgentWorkflowService } from './agent-workflow.service';
import { TrendWorker } from './trend.worker';
import { AgentsController } from './agents.controller';
import { TrendInsight } from '../entities/trend-insight.entity';
import { Campaign } from '../entities/campaign.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrendInsight, Campaign, CampaignAnalytics]),
    BullModule.registerQueue({ name: 'trend.scan' }),
  ],
  controllers: [AgentsController],
  providers: [
    CustomerIntelligenceService,
    SegmentationAgentService,
    CampaignAgentService,
    TrendAgentService,
    AnalyticsAgentService,
    AgentWorkflowService,
    TrendWorker,
  ],
  exports: [
    CustomerIntelligenceService,
    SegmentationAgentService,
    CampaignAgentService,
    TrendAgentService,
    AnalyticsAgentService,
    AgentWorkflowService,
  ],
})
export class AgentsModule {}
