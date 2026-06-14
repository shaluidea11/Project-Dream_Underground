import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';

@Entity('campaign_analytics')
export class CampaignAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', unique: true })
  campaignId: string;

  @Column({ name: 'total_sent', type: 'int', default: 0 })
  totalSent: number;

  @Column({ name: 'total_delivered', type: 'int', default: 0 })
  totalDelivered: number;

  @Column({ name: 'total_failed', type: 'int', default: 0 })
  totalFailed: number;

  @Column({ name: 'total_opened', type: 'int', default: 0 })
  totalOpened: number;

  @Column({ name: 'total_read', type: 'int', default: 0 })
  totalRead: number;

  @Column({ name: 'total_clicked', type: 'int', default: 0 })
  totalClicked: number;

  @Column({ name: 'total_converted', type: 'int', default: 0 })
  totalConverted: number;

  @Column({ name: 'computed_at', type: 'timestamp', nullable: true })
  computedAt: Date;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string | null;

  @OneToOne(() => Campaign, (campaign) => campaign.analytics)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
