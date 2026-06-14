import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Campaign } from '../entities/campaign.entity';
import { Customer } from '../entities/customer.entity';
import { Communication } from '../entities/communication.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';

@Processor('campaign.send')
export class CampaignSendWorker extends WorkerHost {
  private readonly logger = new Logger(CampaignSendWorker.name);
  private readonly simulatorUrl: string;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignAnalytics)
    private readonly analyticsRepo: Repository<CampaignAnalytics>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    super();
    this.simulatorUrl = this.config.get<string>('SIMULATOR_URL') ||
                        this.config.get<string>('CHANNEL_SIMULATOR_URL') ||
                        'http://127.0.0.1:3002';
  }

  async process(job: Job<{ campaignId: string }>): Promise<void> {
    const { campaignId } = job.data;
    this.logger.log(`Processing campaign send for campaign ${campaignId}...`);

    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
      relations: ['segment'],
    });

    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found`);
      return;
    }

    if (campaign.status !== 'running') {
      this.logger.warn(`Campaign ${campaignId} is in state ${campaign.status}, skipping send`);
      return;
    }

    // Get all customers in this segment
    const customers = await this.customerRepo.createQueryBuilder('c')
      .innerJoin('c.segmentMemberships', 'sm')
      .where('sm.segmentId = :segmentId', { segmentId: campaign.segmentId })
      .leftJoinAndSelect('c.orders', 'o')
      .getMany();

    if (customers.length === 0) {
      this.logger.warn(`Campaign ${campaignId} target segment is empty`);
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      await this.campaignRepo.save(campaign);
      return;
    }

    this.logger.log(`Sending campaign ${campaignId} to ${customers.length} customers`);

    // Create communication entries in the database
    const communications: Communication[] = [];

    for (const customer of customers) {
      // Find last order
      const lastOrder = customer.orders && customer.orders.length > 0
        ? customer.orders.reduce((prev, current) =>
            new Date(prev.orderedAt) > new Date(current.orderedAt) ? prev : current,
          )
        : undefined;

      const personalizedMessage = this.personalizeMessage(
        campaign.messageBody,
        customer,
        lastOrder,
      );

      const comm = new Communication();
      comm.campaignId = campaign.id;
      comm.customerId = customer.id;
      comm.recipientPhone = customer.phone;
      comm.recipientEmail = customer.email;
      comm.channel = campaign.channel;
      comm.messageBody = personalizedMessage;
      comm.status = 'sent'; // Dispatched from CRM
      comm.sentAt = new Date();

      communications.push(comm);
    }

    // Save communications and update analytics in a transaction
    await this.dataSource.transaction(async (manager) => {
      // Save all communication rows
      await manager.save(Communication, communications);

      // Increment total_sent in analytics
      await manager.query(
        `UPDATE campaign_analytics SET total_sent = total_sent + $1, computed_at = NOW() WHERE campaign_id = $2`,
        [communications.length, campaignId],
      );

      // Set campaign status to completed
      await manager.query(
        `UPDATE campaigns SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [campaignId],
      );
    });

    // Send async requests to simulator
    for (const comm of communications) {
      const recipient = campaign.channel === 'email' ? comm.recipientEmail : comm.recipientPhone;
      try {
        // Send asynchronously without awaiting to avoid stalling worker
        this.sendToSimulator({
          recipient,
          channel: campaign.channel,
          message: comm.messageBody,
          campaignId: campaign.id,
          communicationId: comm.id,
        });
      } catch (err) {
        this.logger.error(`Failed to send communication ${comm.id} to simulator: ${err.message}`);
      }
    }

    this.logger.log(`Campaign ${campaignId} dispatch complete`);
  }

  private personalizeMessage(message: string, customer: Customer, lastOrder?: any): string {
    let personalized = message;
    personalized = personalized.replace(/\{\{customer\.name\}\}/g, customer.canonicalName || '');
    personalized = personalized.replace(/\{\{customer\.city\}\}/g, customer.city || '');
    personalized = personalized.replace(/\{\{order\.last_amount\}\}/g, lastOrder ? lastOrder.amount.toString() : '');
    personalized = personalized.replace(
      /\{\{order\.last_date\}\}/g,
      lastOrder ? new Date(lastOrder.orderedAt).toLocaleDateString() : '',
    );
    return personalized;
  }

  private async sendToSimulator(payload: {
    recipient: string;
    channel: string;
    message: string;
    campaignId: string;
    communicationId: string;
  }) {
    const url = `${this.simulatorUrl}/send`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        this.logger.warn(
          `Simulator returned status ${res.status} for comm ${payload.communicationId}`,
        );
      }
    } catch (err) {
      // In Stage 6, the simulator might return 501 Not Implemented or not be fully running/reachable yet,
      // so we just log and continue.
      this.logger.debug(`Could not reach simulator: ${err.message}`);
    }
  }
}
