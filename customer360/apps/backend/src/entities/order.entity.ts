import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'external_order_id', unique: true, nullable: true })
  externalOrderId: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ default: 'completed' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  items: Record<string, any>[];

  @Index()
  @Column({ name: 'ordered_at', type: 'timestamp' })
  orderedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
