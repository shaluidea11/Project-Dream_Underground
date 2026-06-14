import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Segment } from './segment.entity';
import { Communication } from './communication.entity';
import { CampaignAnalytics } from './campaign-analytics.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'segment_id' })
  segmentId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['whatsapp', 'sms', 'email', 'rcs'] })
  channel: string;

  @Column({ name: 'message_body', type: 'text' })
  messageBody: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ name: 'cta_text', nullable: true })
  ctaText: string;

  @Column({ name: 'cta_url', nullable: true })
  ctaUrl: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'scheduled', 'running', 'completed', 'paused'],
    default: 'draft',
  })
  status: string;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Segment, (segment) => segment.campaigns)
  @JoinColumn({ name: 'segment_id' })
  segment: Segment;

  @OneToMany(() => Communication, (comm) => comm.campaign)
  communications: Communication[];

  @OneToOne(() => CampaignAnalytics, (analytics) => analytics.campaign)
  analytics: CampaignAnalytics;
}
