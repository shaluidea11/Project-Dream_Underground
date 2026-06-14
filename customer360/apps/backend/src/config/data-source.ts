import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as entities from '../entities/index';

dotenv.config();

const baseDir = process.cwd().endsWith('apps/backend')
  ? process.cwd()
  : join(process.cwd(), 'apps/backend');

const isProduction = process.env.NODE_ENV === 'production';
const rawDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = rawDatabaseUrl
  ? (rawDatabaseUrl.includes('@base:')
      ? rawDatabaseUrl.replace('@base:', '@base.railway.internal:')
      : (rawDatabaseUrl.includes('@base/')
          ? rawDatabaseUrl.replace('@base/', '@base.railway.internal/')
          : rawDatabaseUrl))
  : undefined;
const useSsl = isProduction || (databaseUrl && (databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require')));

// Prefer DATABASE_URL (Neon/Railway), fallback to individual vars (local dev)
const connectionOptions = databaseUrl
  ? {
      url: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST === 'base' ? 'base.railway.internal' : (process.env.DB_HOST || 'localhost'),
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'customer360',
    };

export default new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: Object.values(entities),
  // Resolve relative to this file so it works both in dev (src/*.ts) and compiled (dist/*.js)
  migrations: [join(__dirname, '../migrations/*.{ts,js}')],
  synchronize: false,
} as any);

