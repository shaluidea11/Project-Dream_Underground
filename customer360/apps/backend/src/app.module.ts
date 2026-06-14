import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { UploadModule } from './upload/upload.module';
import { CustomersModule } from './customers/customers.module';
import { SegmentsModule } from './segments/segments.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CallbacksModule } from './callbacks/callbacks.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 60,
      },
      {
        name: 'auth',
        ttl: 900000,
        limit: 10,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        const isProduction = config.get('NODE_ENV') === 'production';

        // Prefer DATABASE_URL (Neon/Railway), fallback to individual vars (local dev)
        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: isProduction ? { rejectUnauthorized: false } : false,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            synchronize: false,
            logging: config.get('DB_LOGGING', 'false') === 'true',
            migrationsRun: true,
          };
        }

        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USERNAME', 'postgres'),
          password: config.get('DB_PASSWORD', 'postgres'),
          database: config.get('DB_NAME', 'customer360'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          synchronize: false,
          logging: config.get('DB_LOGGING', 'false') === 'true',
          migrationsRun: true,
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');

        // Prefer REDIS_URL (Upstash), fallback to individual vars (local dev)
        if (redisUrl) {
          const url = new URL(redisUrl);
          const useTls = url.protocol === 'rediss:';
          return {
            connection: {
              host: url.hostname,
              port: parseInt(url.port || (useTls ? '6380' : '6379'), 10),
              password: url.password || undefined,
              ...(useTls ? { tls: {} } : {}),
            },
          };
        }

        return {
          connection: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get('REDIS_PASSWORD', undefined),
          },
        };
      },
    }),
    HealthModule,
    AuditModule,
    AuthModule,
    UploadModule,
    CustomersModule,
    SegmentsModule,
    CampaignsModule,
    CallbacksModule,
    AnalyticsModule,
    AgentsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
