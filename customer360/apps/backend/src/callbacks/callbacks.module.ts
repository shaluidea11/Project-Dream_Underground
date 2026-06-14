import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Communication } from '../entities/communication.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';
import { CallbacksController } from './callbacks.controller';
import { CallbackWorker } from './callback.worker';
import { AnalyticsWorker } from './analytics.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([Communication, CampaignAnalytics]),
    BullModule.registerQueue({ name: 'callback.process' }),
    BullModule.registerQueue({ name: 'analytics.compute' }),
  ],
  controllers: [CallbacksController],
  providers: [CallbackWorker, AnalyticsWorker],
  exports: [],
})
export class CallbacksModule {}
