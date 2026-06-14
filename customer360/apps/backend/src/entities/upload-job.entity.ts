import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('upload_jobs')
export class UploadJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'enum', enum: ['customers', 'orders'] })
  type: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Column({ name: 'schema_map', type: 'jsonb', nullable: true })
  schemaMap: Record<string, any>;

  @Column({ name: 'records_processed', type: 'int', default: 0 })
  recordsProcessed: number;

  @Column({ name: 'duplicates_merged', type: 'int', default: 0 })
  duplicatesMerged: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
