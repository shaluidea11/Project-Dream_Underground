import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';

@Processor('analytics.compute')
export class AnalyticsWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(
    @InjectRepository(CampaignAnalytics)
    private readonly analyticsRepo: Repository<CampaignAnalytics>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(job: Job<{ campaignId: string }>): Promise<void> {
    const { campaignId } = job.data;
    this.logger.log(`Computing analytics aggregates for campaign ${campaignId}...`);

    const stats = await this.dataSource.query(`
      SELECT
        COUNT(CASE WHEN status IN ('sent', 'delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 END) as total_sent,
        COUNT(CASE WHEN status IN ('delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 END) as total_delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
        COUNT(CASE WHEN status IN ('opened', 'read', 'clicked', 'converted') THEN 1 END) as total_opened,
        COUNT(CASE WHEN status IN ('read', 'clicked', 'converted') THEN 1 END) as total_read,
        COUNT(CASE WHEN status IN ('clicked', 'converted') THEN 1 END) as total_clicked,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as total_converted
      FROM communications
      WHERE campaign_id = $1
    `, [campaignId]);

    let analytics = await this.analyticsRepo.findOne({ where: { campaignId } });
    if (!analytics) {
      analytics = new CampaignAnalytics();
      analytics.campaignId = campaignId;
    }

    analytics.totalSent = parseInt(stats[0].total_sent || '0', 10);
    analytics.totalDelivered = parseInt(stats[0].total_delivered || '0', 10);
    analytics.totalFailed = parseInt(stats[0].total_failed || '0', 10);
    analytics.totalOpened = parseInt(stats[0].total_opened || '0', 10);
    analytics.totalRead = parseInt(stats[0].total_read || '0', 10);
    analytics.totalClicked = parseInt(stats[0].total_clicked || '0', 10);
    analytics.totalConverted = parseInt(stats[0].total_converted || '0', 10);
    analytics.computedAt = new Date();

    await this.analyticsRepo.save(analytics);
    this.logger.log(`Campaign ${campaignId} analytics updated: Sent=${analytics.totalSent}, Delivered=${analytics.totalDelivered}, Converted=${analytics.totalConverted}`);
  }
}
