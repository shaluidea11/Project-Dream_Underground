import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Customer } from './customer.entity';

@Entity('communications')
export class Communication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone: string;

  @Column({ name: 'recipient_email', nullable: true })
  recipientEmail: string;

  @Column({ type: 'enum', enum: ['whatsapp', 'sms', 'email', 'rcs'] })
  channel: string;

  @Column({ name: 'message_body', type: 'text' })
  messageBody: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'converted'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ name: 'clicked_at', type: 'timestamp', nullable: true })
  clickedAt: Date;

  @Column({ name: 'converted_at', type: 'timestamp', nullable: true })
  convertedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Campaign, (campaign) => campaign.communications)
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Customer, (customer) => customer.communications)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
