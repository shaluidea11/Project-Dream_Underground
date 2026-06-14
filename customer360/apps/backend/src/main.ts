import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seed } from './seed/run-seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Simulator-Secret'],
  });

  // Auto-seed database if empty
  const dataSource = app.get(DataSource);
  try {
    const [{ count: customerCount }] = await dataSource.query('SELECT COUNT(*) as count FROM customers');
    const [{ count: userCount }] = await dataSource.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(customerCount, 10) === 0 && parseInt(userCount, 10) === 0) {
      console.log('🌱 Empty database detected. Running auto-seed...');
      await seed(dataSource);
      console.log('🌱 Database seeded successfully!');
    }
  } catch (e) {
    // Non-fatal: server still starts even if seed check fails
    console.warn('⚠️ Auto-seed check skipped:', (e as Error).message);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on http://0.0.0.0:${port}`);
}
bootstrap();
