import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { CustomerIdentityMap } from './customer-identity-map.entity';
import { SegmentMembership } from './segment-membership.entity';
import { Communication } from './communication.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'canonical_name' })
  canonicalName: string;

  @Index()
  @Column({ unique: true, nullable: true })
  email: string;

  @Index()
  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ name: 'preferred_channel', nullable: true })
  preferredChannel: string;

  @Column({ name: 'engagement_score', type: 'float', default: 0 })
  engagementScore: number;

  @Column({ name: 'lifetime_value', type: 'float', default: 0 })
  lifetimeValue: number;

  @Column({ name: 'total_spend', type: 'float', default: 0 })
  totalSpend: number;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  @Column({ name: 'last_order_at', type: 'timestamp', nullable: true })
  lastOrderAt: Date;

  @Column({ name: 'raw_identities', type: 'jsonb', nullable: true })
  rawIdentities: Record<string, any>[];

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @OneToMany(() => CustomerIdentityMap, (map) => map.canonicalCustomer)
  identityMaps: CustomerIdentityMap[];

  @OneToMany(() => SegmentMembership, (sm) => sm.customer)
  segmentMemberships: SegmentMembership[];

  @OneToMany(() => Communication, (comm) => comm.customer)
  communications: Communication[];
}
