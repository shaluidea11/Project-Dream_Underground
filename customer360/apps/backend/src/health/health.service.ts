import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private redis: Redis;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
  }

  async check() {
    const services: Record<string, string> = {};

    // Check database
    try {
      await this.dataSource.query('SELECT 1');
      services.database = 'ok';
    } catch {
      services.database = 'error';
    }

    // Check Redis
    try {
      await this.redis.ping();
      services.redis = 'ok';
    } catch {
      services.redis = 'error';
    }

    const allOk = Object.values(services).every((s) => s === 'ok');
    return { status: allOk ? 'ok' : 'degraded', services };
  }
}
