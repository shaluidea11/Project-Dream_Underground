import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UploadJob } from '../entities/upload-job.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(UploadJob)
    private readonly uploadJobRepo: Repository<UploadJob>,
    @InjectQueue('upload.process')
    private readonly uploadQueue: Queue,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 1,
    });
  }

  async createJob(
    userId: string,
    fileName: string,
    fileBuffer: Buffer,
    uploadType: 'customers' | 'orders',
    ip?: string,
  ) {
    // Create upload job record
    const job = this.uploadJobRepo.create({
      createdBy: userId,
      fileName,
      fileUrl: `memory://${fileName}`, // File is in memory, passed via job data
      type: uploadType,
      status: 'pending',
    });
    const saved = await this.uploadJobRepo.save(job);

    // Enqueue BullMQ job with file buffer
    await this.uploadQueue.add(
      'process-upload',
      {
        jobId: saved.id,
        fileName,
        fileBase64: fileBuffer.toString('base64'),
        uploadType,
        userId,
      },
      {
        jobId: saved.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );

    // Audit log
    await this.auditService.log(
      userId,
      'FILE_UPLOADED',
      'upload_job',
      saved.id,
      { fileName, type: uploadType },
      ip,
    );

    this.logger.log(`Upload job ${saved.id} created for ${fileName}`);
    return saved;
  }

  async getJob(jobId: string): Promise<UploadJob> {
    const job = await this.uploadJobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Upload job not found');
    return job;
  }

  async getJobs(userId: string): Promise<UploadJob[]> {
    return this.uploadJobRepo.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * Publish progress update to Redis for SSE consumption.
   */
  async publishProgress(jobId: string, data: Record<string, any>): Promise<void> {
    await this.redis.publish(`upload:${jobId}`, JSON.stringify(data));
  }
}
