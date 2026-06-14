import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_identity_map')
export class CustomerIdentityMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'canonical_customer_id' })
  canonicalCustomerId: string;

  @Column({ name: 'source_name', nullable: true })
  sourceName: string;

  @Column({ name: 'source_email', nullable: true })
  sourceEmail: string;

  @Column({ name: 'source_phone', nullable: true })
  sourcePhone: string;

  @Column({ name: 'source_file', nullable: true })
  sourceFile: string;

  @Column({ name: 'match_confidence', type: 'float', default: 1.0 })
  matchConfidence: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.identityMaps)
  @JoinColumn({ name: 'canonical_customer_id' })
  canonicalCustomer: Customer;
}
