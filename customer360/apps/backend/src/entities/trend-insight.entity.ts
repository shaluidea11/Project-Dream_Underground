import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('trend_insights')
export class TrendInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  insight: string;

  @Column('jsonb', { name: 'suggested_segment', nullable: true })
  suggestedSegment: {
    name: string;
    description: string;
    filter_ast: any;
  } | null;

  @Column({ name: 'suggested_channel', default: 'whatsapp' })
  suggestedChannel: string;

  @Column('text', { name: 'suggested_message', nullable: true })
  suggestedMessage: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
