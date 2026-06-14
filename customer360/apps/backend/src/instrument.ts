import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://d9d015c59d68a5b2d3e7e3efe39c9e5e@o4511564344852480.ingest.de.sentry.io/4511564381552720',
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
});
