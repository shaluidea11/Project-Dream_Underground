import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { SegmentMembership } from './segment-membership.entity';
import { Campaign } from './campaign.entity';

@Entity('segments')
export class Segment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'filter_definition', type: 'jsonb', nullable: true })
  filterDefinition: Record<string, any>;

  @Column({ name: 'nl_query', nullable: true })
  nlQuery: string;

  @Column({ name: 'customer_count', type: 'int', default: 0 })
  customerCount: number;

  @Column({ name: 'last_computed_at', type: 'timestamp', nullable: true })
  lastComputedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => SegmentMembership, (sm) => sm.segment)
  memberships: SegmentMembership[];

  @OneToMany(() => Campaign, (c) => c.segment)
  campaigns: Campaign[];
}
