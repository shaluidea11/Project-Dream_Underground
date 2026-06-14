import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    ip?: string,
  ): Promise<void> {
    await this.auditRepo.insert({
      userId: userId ?? undefined,
      action,
      resourceType,
      resourceId: resourceId ?? undefined,
      metadata: metadata ?? {},
      ipAddress: ip ?? undefined,
    });
  }
}
