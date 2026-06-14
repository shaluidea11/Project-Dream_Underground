import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from 'bullmq';
import { Communication } from '../entities/communication.entity';

const STATUS_PREFERENCE: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  failed: 2,
  opened: 3,
  read: 3,
  clicked: 4,
  converted: 5,
};

@Processor('callback.process')
export class CallbackWorker extends WorkerHost {
  private readonly logger = new Logger(CallbackWorker.name);

  constructor(
    @InjectRepository(Communication)
    private readonly commRepo: Repository<Communication>,
    @InjectQueue('analytics.compute')
    private readonly analyticsQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<{
      campaignId: string;
      communicationId: string;
      status: string;
      timestamp: string;
    }>,
  ): Promise<void> {
    const { campaignId, communicationId, status, timestamp } = job.data;
    this.logger.log(`Processing callback for comm ${communicationId} with status ${status}`);

    const comm = await this.commRepo.findOne({ where: { id: communicationId } });
    if (!comm) {
      this.logger.warn(`Communication ${communicationId} not found, skipping`);
      return;
    }

    const currentScore = STATUS_PREFERENCE[comm.status] || 0;
    const incomingScore = STATUS_PREFERENCE[status] || 0;

    // Race condition / status out-of-order check
    if (incomingScore > currentScore) {
      comm.status = status;
    }

    // Always fill in timestamps if they are not yet populated
    const parsedTime = new Date(timestamp);
    if (status === 'delivered' && !comm.deliveredAt) comm.deliveredAt = parsedTime;
    if ((status === 'opened' || status === 'read') && !comm.openedAt) comm.openedAt = parsedTime;
    if (status === 'clicked' && !comm.clickedAt) comm.clickedAt = parsedTime;
    if (status === 'converted' && !comm.convertedAt) comm.convertedAt = parsedTime;
    if (status === 'sent' && !comm.sentAt) comm.sentAt = parsedTime;

    await this.commRepo.save(comm);

    // Enqueue job to compute analytics for this campaign
    await this.analyticsQueue.add('compute', { campaignId });
    this.logger.log(`Updated comm ${communicationId} to ${comm.status} and enqueued analytics compute`);
  }
}
