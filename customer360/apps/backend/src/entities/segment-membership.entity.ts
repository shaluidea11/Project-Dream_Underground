import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { Segment } from './segment.entity';
import { Customer } from './customer.entity';

@Entity('segment_memberships')
export class SegmentMembership {
  @PrimaryColumn({ name: 'segment_id' })
  segmentId: string;

  @PrimaryColumn({ name: 'customer_id' })
  customerId: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @ManyToOne(() => Segment, (segment) => segment.memberships)
  @JoinColumn({ name: 'segment_id' })
  segment: Segment;

  @ManyToOne(() => Customer, (customer) => customer.segmentMemberships)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
