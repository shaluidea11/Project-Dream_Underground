import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TrendAgentService } from './trend-agent.service';

@Processor('trend.scan')
export class TrendWorker extends WorkerHost {
  private readonly logger = new Logger(TrendWorker.name);

  constructor(private readonly trendAgent: TrendAgentService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Executing background repeatable trend scan job ${job.id}...`);
    try {
      await this.trendAgent.runScan();
      this.logger.log(`Trend scan job completed successfully.`);
    } catch (err: any) {
      this.logger.error(`Trend scan job failed: ${err.message}`, err.stack);
      throw err;
    }
  }
}
