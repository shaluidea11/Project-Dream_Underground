# deployment.md — Customer360 AI CRM
> **Dream Underground CRM** | Deployment Reference Document  
> Version: 1.0 | Status: Approved for Stage 0

---

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Repository (monorepo)                           │
│  apps/frontend | apps/backend | apps/channel-simulator  │
└──────────────┬──────────────────────────────────────────┘
               │ GitHub Actions CI/CD
       ┌───────┴───────┐
       ▼               ▼
  ┌─────────┐    ┌─────────────────────────────┐
  │  Vercel │    │  Railway                    │
  │         │    │  ┌──────────┐ ┌──────────┐  │
  │ Next.js │    │  │ NestJS   │ │ Fastify  │  │
  │Frontend │    │  │ Backend  │ │Simulator │  │
  └─────────┘    │  └────┬─────┘ └──────────┘  │
                 └───────┼─────────────────────┘
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │  Neon   │ │Upstash  │ │UploadT. │
        │  (PG)   │ │ (Redis) │ │  (S3)   │
        └─────────┘ └─────────┘ └─────────┘
```

---

## 2. Service Deployment Targets

| Service | Platform | Plan | Notes |
|---|---|---|---|
| Frontend | Vercel | Hobby (free) | Auto-deploy on push to `main` |
| Backend (NestJS) | Railway | Starter $5/mo | Always-on, not serverless |
| Channel Simulator | Railway | Starter $5/mo | Separate service within same Railway project |
| PostgreSQL | Neon | Free tier | 512MB storage, 1 compute unit |
| Redis | Upstash | Free tier | 10k commands/day, BullMQ compatible |
| File Storage | UploadThing | Free tier | 2GB storage, 4GB bandwidth/mo |
| Error Tracking | Sentry | Free | 5k errors/mo |
| Product Analytics | PostHog | Free | 1M events/mo |

---

## 3. Environment Variables

### 3.1 Frontend (Vercel) — `apps/frontend/.env`

```bash
# Public (exposed to browser — prefix NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.customer360.railway.app
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Server-only (used in Next.js route handlers only)
UPLOADTHING_SECRET=sk_live_xxxxxxxxxxxxxxxxxxxx
UPLOADTHING_APP_ID=xxxxxxxxxxxx
```

### 3.2 Backend (Railway) — `apps/backend/.env`

```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/customer360?sslmode=require

# Redis
REDIS_URL=rediss://default:xxxxxxxxxxxx@us1-xxx.upstash.io:6379

# Auth
JWT_SECRET=<64-char random secret — generate with: openssl rand -hex 32>
JWT_EXPIRES_IN=7d
COOKIE_SECRET=<another 64-char random secret>

# Gemini (free tier — get key from https://aistudio.google.com)
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash

# Channel Simulator (internal Railway URL)
CHANNEL_SIMULATOR_URL=https://simulator.customer360.railway.app
CHANNEL_SIMULATOR_SECRET=<shared secret for callback auth>

# Callback URL (this service's own public URL, sent to simulator)
CRM_CALLBACK_URL=https://api.customer360.railway.app/callbacks/delivery

# UploadThing
UPLOADTHING_SECRET=sk_live_xxxxxxxxxxxxxxxxxxxx
UPLOADTHING_APP_ID=xxxxxxxxxxxx

# Sentry
SENTRY_DSN=https://xxxx@oXXXX.ingest.sentry.io/XXXXX

# PostHog (server-side)
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxx
```

### 3.3 Channel Simulator (Railway) — `apps/channel-simulator/.env`

```bash
NODE_ENV=production
PORT=3002

# Shared secret — simulator validates this on incoming /send requests
SIMULATOR_SECRET=<same shared secret as CRM_SIMULATOR_SECRET above>

# The CRM callback URL — simulator posts delivery events here
CRM_CALLBACK_URL=https://api.customer360.railway.app/callbacks/delivery

# Sentry
SENTRY_DSN=https://xxxx@oXXXX.ingest.sentry.io/XXXXX
```

### 3.4 Local Development — Root `.env` (shared via npm workspaces)

```bash
# Local overrides
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/customer360
REDIS_URL=redis://localhost:6379
CHANNEL_SIMULATOR_URL=http://localhost:3002
CRM_CALLBACK_URL=http://localhost:3001/callbacks/delivery
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### 4.1 File: `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────
  # 1. Lint + Type Check
  # ─────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint --workspaces
      - run: npm run typecheck --workspaces

  # ─────────────────────────────
  # 2. Tests
  # ─────────────────────────────
  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: customer360_test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test --workspaces --if-present
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/customer360_test
          REDIS_URL: redis://localhost:6379

  # ─────────────────────────────
  # 3. Deploy Frontend (Vercel)
  # ─────────────────────────────
  deploy-frontend:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build --workspace=apps/frontend
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_POSTHOG_KEY: ${{ secrets.NEXT_PUBLIC_POSTHOG_KEY }}
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/frontend
          vercel-args: '--prod'

  # ─────────────────────────────
  # 4. Deploy Backend (Railway)
  # ─────────────────────────────
  deploy-backend:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm install -g @railway/cli
      - run: railway up --service backend
        working-directory: apps/backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  # ─────────────────────────────
  # 5. Deploy Simulator (Railway)
  # ─────────────────────────────
  deploy-simulator:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @railway/cli
      - run: railway up --service simulator
        working-directory: apps/channel-simulator
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 4.2 Required GitHub Secrets

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
RAILWAY_TOKEN
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_POSTHOG_KEY
GEMINI_API_KEY
```

---

## 5. Database Migration Strategy

### 5.1 Migration Tool
TypeORM CLI migrations. Each schema change = one migration file.

```bash
# Generate migration from entity changes
npm run migration:generate --workspace=apps/backend -- src/migrations/AddCustomerEngagementScore

# Run pending migrations
npm run migration:run --workspace=apps/backend

# Revert last migration
npm run migration:revert --workspace=apps/backend
```

### 5.2 Migration on Deploy
Railway deploy command includes migration run:

```json
// apps/backend/package.json
{
  "scripts": {
    "start:prod": "npm run migration:run && node dist/main",
    "migration:run": "typeorm migration:run -d dist/data-source.js",
    "migration:generate": "typeorm migration:generate -d src/data-source.ts"
  }
}
```

### 5.3 Migration File Naming
```
src/migrations/
├── 1700000001000-CreateUsersTable.ts
├── 1700000002000-CreateCustomersTable.ts
├── 1700000003000-CreateOrdersTable.ts
├── 1700000004000-CreateSegmentsTable.ts
├── 1700000005000-CreateCampaignsTable.ts
├── 1700000006000-CreateCommunicationsTable.ts
└── 1700000007000-CreateAuditLogsTable.ts
```

---

## 6. Backup Strategy

### 6.1 Database (Neon)
- Neon provides **point-in-time recovery** on free tier (7 days)
- Manual backup: nightly pg_dump via Railway cron job
  ```bash
  pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
  ```
- Backup stored in UploadThing bucket under `/backups/`

### 6.2 Redis (Upstash)
- BullMQ job results: `removeOnComplete: { count: 100 }` — not backup-critical
- No persistent Redis backup needed (queues are transient)

---

## 7. Rollback Strategy

### 7.1 Frontend (Vercel)
- Vercel keeps all deployments. Rollback = click "Promote to Production" on previous deployment in Vercel dashboard.
- Takes < 30 seconds.

### 7.2 Backend (Railway)
- Railway keeps deployment history. Rollback via Railway dashboard → "Redeploy" previous image.
- If DB migration is involved: run `migration:revert` manually via Railway shell.

### 7.3 Database Rollback
- Every migration has a `down()` method.
- For destructive changes: write migration with `ALTER TABLE ... ADD COLUMN` only (never DROP in v1).
- Column drops deferred to next major version.

### 7.4 Hotfix Process
```
1. Create hotfix branch from main
2. Fix + test locally
3. Push to hotfix/* branch
4. Open PR → CI runs
5. Merge → auto-deploy
6. Monitor Sentry for 15 minutes
```

---

## 8. Local Development Setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for local PG + Redis)
- Git

### Steps

```bash
# 1. Clone
git clone https://github.com/your-org/customer360.git
cd customer360

# 2. Install all workspace dependencies
npm install

# 3. Start local services
docker compose up -d  # starts postgres + redis

# 4. Copy env files
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/channel-simulator/.env.example apps/channel-simulator/.env

# 5. Run migrations
npm run migration:run --workspace=apps/backend

# 6. Seed sample data
npm run seed --workspace=apps/backend

# 7. Start all services (3 terminals or use concurrently)
npm run dev --workspace=apps/frontend        # :3000
npm run dev --workspace=apps/backend         # :3001
npm run dev --workspace=apps/channel-simulator  # :3002
```

### docker-compose.yml (root)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: customer360
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

---

## 9. Monitoring & Alerting

| Tool | What it monitors | Alert trigger |
|---|---|---|
| Sentry | Unhandled exceptions, API errors | Any new error event |
| Railway metrics | CPU, memory, response time | CPU > 80% for 5m |
| Neon console | DB connections, query time | > 100 connections |
| Upstash console | Redis memory, commands/sec | Memory > 80% |
| Health endpoint | DB + Redis + Simulator reachability | `/health` returns non-200 |

Health endpoint response format:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "simulator": "ok"
  }
}
```