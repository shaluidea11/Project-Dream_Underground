import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Campaign } from '../entities/campaign.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';
import { Segment } from '../entities/segment.entity';
import { SegmentsService } from '../segments/segments.service';
import { CampaignAgentService, CampaignSuggestion } from '../agents/campaign-agent.service';

export interface CreateCampaignDto {
  name: string;
  segmentId: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  messageBody: string;
  subject?: string;
  ctaText?: string;
  ctaUrl?: string;
  scheduledAt?: string | Date;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignAnalytics)
    private readonly analyticsRepo: Repository<CampaignAnalytics>,
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
    private readonly segmentsService: SegmentsService,
    private readonly campaignAgent: CampaignAgentService,
    @InjectQueue('campaign.send')
    private readonly sendQueue: Queue,
  ) {}

  async create(dto: CreateCampaignDto, userId: string): Promise<Campaign> {
    const segment = await this.segmentRepo.findOne({ where: { id: dto.segmentId } });
    if (!segment) {
      throw new NotFoundException(`Segment ${dto.segmentId} not found`);
    }

    const campaign = new Campaign();
    campaign.name = dto.name;
    campaign.segmentId = dto.segmentId;
    campaign.channel = dto.channel;
    campaign.messageBody = dto.messageBody;
    campaign.subject = (dto.subject || null) as any;
    campaign.ctaText = (dto.ctaText || null) as any;
    campaign.ctaUrl = (dto.ctaUrl || null) as any;
    campaign.createdBy = userId;
    campaign.status = dto.scheduledAt ? 'scheduled' : 'draft';
    campaign.scheduledAt = (dto.scheduledAt ? new Date(dto.scheduledAt) : null) as any;

    const saved = await this.campaignRepo.save(campaign);

    // Initialize campaign analytics record
    const analytics = new CampaignAnalytics();
    analytics.campaignId = saved.id;
    await this.analyticsRepo.save(analytics);

    return saved;
  }

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      relations: ['segment', 'analytics'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: ['segment', 'analytics'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async launch(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new BadRequestException(`Campaign status is ${campaign.status}, cannot launch`);
    }

    // Verify segment has members
    const count = await this.segmentsService.executeFilterCount(
      campaign.segment.filterDefinition as any,
    );
    if (count === 0) {
      throw new BadRequestException('Cannot launch campaign with 0-member segment');
    }

    campaign.status = 'running';
    campaign.startedAt = new Date();
    const saved = await this.campaignRepo.save(campaign);

    // Enqueue sending job
    await this.sendQueue.add('send', { campaignId: saved.id });

    return saved;
  }

  async aiGenerate(goal: string): Promise<CampaignSuggestion & { estimatedSize: number }> {
    const suggestion = await this.campaignAgent.generateCampaign(goal);
    
    // Estimate size of the suggested segment
    let estimatedSize = 0;
    try {
      estimatedSize = await this.segmentsService.executeFilterCount(
        suggestion.suggested_segment.filter_ast,
      );
    } catch (err) {
      this.logger.warn(`Failed to estimate suggested segment size: ${err.message}`);
    }

    return {
      ...suggestion,
      estimatedSize,
    };
  }
}
