import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const baseDir = process.cwd().endsWith('apps/backend')
  ? process.cwd()
  : join(process.cwd(), 'apps/backend');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

// Prefer DATABASE_URL (Neon/Railway), fallback to individual vars (local dev)
const connectionOptions = databaseUrl
  ? {
      url: databaseUrl,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'customer360',
    };

export default new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: [join(baseDir, 'src/**/*.entity{.ts,.js}')],
  migrations: [join(baseDir, 'src/migrations/*{.ts,.js}')],
  synchronize: false,
} as any);
