import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { UploadJob } from '../entities/upload-job.entity';
import { Customer } from '../entities/customer.entity';
import { Order } from '../entities/order.entity';
import { CustomerIdentityMap } from '../entities/customer-identity-map.entity';
import { AuditModule } from '../audit/audit.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadWorker } from './upload.worker';
import { SchemaDetector } from './services/schema-detector';
import { CustomerMerger } from './services/customer-merger';

@Module({
  imports: [
    TypeOrmModule.forFeature([UploadJob, Customer, Order, CustomerIdentityMap]),
    BullModule.registerQueue({ name: 'upload.process' }),
    AuditModule,
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    UploadWorker,
    SchemaDetector,
    CustomerMerger,
  ],
  exports: [UploadService],
})
export class UploadModule {}
