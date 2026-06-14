import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';

dotenv.config();

console.log('Sentry DSN:', process.env.SENTRY_DSN);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.SENTRY_DSN,
});
