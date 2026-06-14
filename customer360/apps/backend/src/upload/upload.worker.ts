import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { UploadJob } from '../entities/upload-job.entity';
import { UploadService } from './upload.service';
import { SchemaDetector } from './services/schema-detector';
import { CustomerMerger } from './services/customer-merger';
import { DataNormalizer } from './services/normalizer';
import { DedupEngine, NormalizedCustomer } from './services/dedup-engine';
import { parseCsv } from './parsers/csv-parser';
import { parseExcel } from './parsers/excel-parser';
import { detectFileType } from './validators/file-validator';

interface UploadJobData {
  jobId: string;
  fileName: string;
  fileBase64: string;
  uploadType: 'customers' | 'orders';
  userId: string;
}

@Processor('upload.process')
export class UploadWorker extends WorkerHost {
  private readonly logger = new Logger(UploadWorker.name);

  constructor(
    @InjectRepository(UploadJob)
    private readonly uploadJobRepo: Repository<UploadJob>,
    private readonly uploadService: UploadService,
    private readonly schemaDetector: SchemaDetector,
    private readonly customerMerger: CustomerMerger,
  ) {
    super();
  }

  async process(job: Job<UploadJobData>): Promise<void> {
    const { jobId, fileName, fileBase64, uploadType, userId } = job.data;
    this.logger.log(`Processing upload job ${jobId}: ${fileName}`);

    try {
      // Update status to processing
      await this.uploadJobRepo.update(jobId, { status: 'processing' });
      await this.publishProgress(jobId, { status: 'processing', step: 'parsing', progress: 10 });

      // 1. Parse file
      const buffer = Buffer.from(fileBase64, 'base64');
      const ext = fileName.split('.').pop()?.toLowerCase();
      const fileType = ext === 'csv' ? 'csv' : 'excel';

      const parsed = fileType === 'csv'
        ? parseCsv(buffer)
        : await parseExcel(buffer);

      this.logger.log(`Parsed ${parsed.rowCount} rows with headers: ${parsed.headers.join(', ')}`);
      await this.publishProgress(jobId, { status: 'processing', step: 'schema_detection', progress: 25 });

      // 2. Detect schema
      const schema = await this.schemaDetector.detect(parsed.headers, parsed.rows, uploadType);
      this.logger.log(`Schema detected: ${JSON.stringify(schema.mapping)} (confidence: ${schema.confidence})`);

      await this.uploadJobRepo.update(jobId, { schemaMap: schema.mapping as any });
      await this.publishProgress(jobId, {
        status: 'processing',
        step: 'normalizing',
        progress: 40,
        schemaMap: schema.mapping,
      });

      // 3. Process based on type
      if (schema.detectedType === 'customers' || uploadType === 'customers') {
        await this.processCustomers(jobId, parsed.rows, schema.mapping, fileName);
      } else {
        await this.processOrders(jobId, parsed.rows, schema.mapping);
      }

    } catch (err) {
      this.logger.error(`Upload job ${jobId} failed: ${(err as Error).message}`, (err as Error).stack);
      await this.uploadJobRepo.update(jobId, {
        status: 'failed',
        errorMessage: (err as Error).message,
        completedAt: new Date(),
      });
      await this.publishProgress(jobId, {
        status: 'failed',
        error: (err as Error).message,
        progress: 100,
      });
      throw err;
    }
  }

  private async processCustomers(
    jobId: string,
    rows: Record<string, string>[],
    schemaMap: Record<string, string>,
    sourceFile: string,
  ): Promise<void> {
    // Normalize customer data
    await this.publishProgress(jobId, { status: 'processing', step: 'normalizing', progress: 50 });

    const normalized: NormalizedCustomer[] = rows.map((row, idx) => ({
      canonical_name: DataNormalizer.normalizeName(this.getMappedValue(row, schemaMap, 'canonical_name')),
      email: DataNormalizer.normalizeEmail(this.getMappedValue(row, schemaMap, 'email')),
      phone: DataNormalizer.normalizePhone(this.getMappedValue(row, schemaMap, 'phone')),
      city: this.getMappedValue(row, schemaMap, 'city') || null,
      state: this.getMappedValue(row, schemaMap, 'state') || null,
      preferred_channel: this.getMappedValue(row, schemaMap, 'preferred_channel') || null,
      _sourceIndex: idx,
    }));

    // Deduplicate
    await this.publishProgress(jobId, { status: 'processing', step: 'deduplicating', progress: 65 });
    const groups = DedupEngine.deduplicate(normalized);

    // Merge into database
    await this.publishProgress(jobId, { status: 'processing', step: 'importing', progress: 80 });
    const result = await this.customerMerger.mergeCustomers(groups, sourceFile);

    // Update job as completed
    await this.uploadJobRepo.update(jobId, {
      status: 'completed',
      recordsProcessed: rows.length,
      duplicatesMerged: result.duplicatesMerged,
      completedAt: new Date(),
    });

    await this.publishProgress(jobId, {
      status: 'completed',
      step: 'done',
      progress: 100,
      recordsProcessed: rows.length,
      customersCreated: result.customersCreated,
      customersUpdated: result.customersUpdated,
      duplicatesMerged: result.duplicatesMerged,
    });
  }

  private async processOrders(
    jobId: string,
    rows: Record<string, string>[],
    schemaMap: Record<string, string>,
  ): Promise<void> {
    await this.publishProgress(jobId, { status: 'processing', step: 'importing_orders', progress: 60 });
    const ordersCreated = await this.customerMerger.ingestOrders(rows, schemaMap);

    await this.uploadJobRepo.update(jobId, {
      status: 'completed',
      recordsProcessed: rows.length,
      completedAt: new Date(),
    });

    await this.publishProgress(jobId, {
      status: 'completed',
      step: 'done',
      progress: 100,
      recordsProcessed: rows.length,
      ordersCreated,
    });
  }

  private getMappedValue(
    row: Record<string, string>,
    schemaMap: Record<string, string>,
    targetField: string,
  ): string {
    for (const [source, target] of Object.entries(schemaMap)) {
      if (target === targetField) {
        return row[source] || '';
      }
    }
    return '';
  }

  private async publishProgress(jobId: string, data: Record<string, any>): Promise<void> {
    try {
      await this.uploadService.publishProgress(jobId, data);
    } catch {
      // Non-fatal: SSE client may not be connected
    }
  }
}
