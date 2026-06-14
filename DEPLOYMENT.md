# deployment.md — Customer360 AI CRM
> **Dream Underground CRM** | Deployment Reference Document
> Audience: reviewers / external readers — *how the live application is deployed and wired together.*
> For the step-by-step "how do **we** deploy it" runbook, see [`DEPLOY.md`](DEPLOY.md).

---

## 1. Deployment Architecture

The system is a monorepo (npm workspaces) of three deployable apps plus two managed
data services. Deploys are triggered by **git push** — Vercel and Railway both watch the
repository and rebuild automatically. There is no separate CI server.

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Repository (monorepo — npm workspaces)          │
│  apps/frontend | apps/backend | apps/channel-simulator  │
└──────────────┬───────────────────────┬──────────────────┘
   push        │                        │   push
       ┌───────┴───────┐        ┌───────┴──────────────────┐
       ▼               │        ▼                          │
  ┌─────────┐          │   ┌─────────────────────────────┐ │
  │  Vercel │          │   │  Railway (one project)      │ │
  │         │          │   │  ┌──────────┐ ┌──────────┐  │ │
  │ Next.js │ ──/api──►│   │  │ NestJS   │ │ Fastify  │  │ │
  │Frontend │  (proxy) │   │  │ Backend  │►│Simulator │  │ │
  └─────────┘          │   │  └────┬─────┘ └────┬─────┘  │ │
                       │   └───────┼────────────┼────────┘ │
                       │           │   callbacks│           │
                       │           │◄───────────┘           │
              ┌────────┴───┐   ┌───┴─────┐  ┌────────────┐
              ▼            ▼   ▼         ▼  ▼            ▼
         ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐
         │  Neon   │  │ Upstash │  │ Google  │  │   Sentry     │
         │  (PG)   │  │ (Redis) │  │ Gemini  │  │ (optional)   │
         └─────────┘  └─────────┘  └─────────┘  └──────────────┘
```

The frontend never calls the backend cross-origin in the browser: Next.js **rewrites**
`/api/*` and `/health` to the backend URL (see `apps/frontend/next.config.ts`), so the
browser only ever talks to the Vercel origin.

---

## 2. Service Deployment Targets

| Service | Platform | Plan | Notes |
|---|---|---|---|
| Frontend (Next.js) | Vercel | Hobby (free) | Auto-deploy on push. Root dir = `customer360/apps/frontend` |
| Backend (NestJS API + workers) | Railway | Free/Starter | Always-on (not serverless — BullMQ workers run in-process) |
| Channel Simulator (Fastify) | Railway | Free/Starter | Separate service in the **same** Railway project |
| PostgreSQL | Neon | Free tier | 512 MB. Connected via `DATABASE_URL` (SSL required) |
| Redis | Upstash | Free tier | BullMQ backend. Connected via `REDIS_URL` (`rediss://`, TLS) |
| Error Tracking | Sentry | Free (optional) | Enabled only if `SENTRY_DSN` is set; safe to leave unset |

> **Not used in this build:** there is no external object storage (UploadThing/S3) and no
> product-analytics tool (PostHog). CSV/Excel uploads are parsed **in memory** (Multer) and
> never persisted to a bucket. Earlier drafts of this doc referenced those services; they were
> consciously dropped to keep the deployment surface minimal.

---

## 3. Environment Variables

Each app reads a flat `.env`. Connection-string vars (`DATABASE_URL`, `REDIS_URL`) take
precedence; the individual `DB_*` / `REDIS_*` vars are the local-Docker fallback.

### 3.1 Frontend (Vercel) — `apps/frontend`

```bash
# Public — the backend's public base URL. Used by next.config.ts to proxy /api and /health.
NEXT_PUBLIC_API_URL=https://<backend>.up.railway.app
```

### 3.2 Backend (Railway) — `apps/backend`

```bash
NODE_ENV=production
PORT=3001                         # Railway injects PORT; this is the fallback
FRONTEND_URL=https://<frontend>.vercel.app   # CORS allow-origin

# Database (Neon) — SSL is auto-enabled when NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/customer360?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:xxxx@xxx.upstash.io:6379

# Auth
JWT_SECRET=<64-char random — openssl rand -hex 32>
JWT_EXPIRY=1d

# Gemini (free tier — https://aistudio.google.com)
GEMINI_API_KEY=AIza...

# Channel simulator (backend → simulator outbound)
SIMULATOR_URL=https://<simulator>.up.railway.app
SIMULATOR_SECRET=<shared secret>             # also accepts CHANNEL_SIMULATOR_URL / CHANNEL_SIMULATOR_SECRET

# Sentry (optional — leave empty to disable)
SENTRY_DSN=
```

### 3.3 Channel Simulator (Railway) — `apps/channel-simulator`

```bash
NODE_ENV=production
PORT=3002                         # Railway injects PORT; this is the fallback

# Must match the backend's SIMULATOR_SECRET — sent as X-Simulator-Secret on every callback
SIMULATOR_SECRET=<same shared secret as backend>

# Where the simulator posts delivery events (the backend's receipt API)
CRM_CALLBACK_URL=https://<backend>.up.railway.app/api/callbacks/delivery

# Optional — compress the 30s/60s lifecycle delays for demos (e.g. 0.05 = 20x faster)
SIMULATOR_DELAY_SCALE=1.0

# Sentry (optional)
SENTRY_DSN=
```

### 3.4 Local Development — per-app `.env` (copied from each `.env.example`)

```bash
# backend/.env
DATABASE_URL=                                  # leave blank → falls back to DB_* below
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=customer360
REDIS_URL=                                      # leave blank → falls back to REDIS_* below
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret
SIMULATOR_URL=http://localhost:3002
SIMULATOR_SECRET=dev-secret

# channel-simulator/.env
SIMULATOR_SECRET=dev-secret
CRM_CALLBACK_URL=http://localhost:3001/api/callbacks/delivery

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 4. Build & Release

There is **no GitHub Actions pipeline**. Releases are git-push driven on the hosting
platforms (a conscious scope decision — see NOTES.md, Stage 10).

| App | Builder | Build command | Start command |
|---|---|---|---|
| Backend | Railway / Nixpacks (`railway.toml`) | `npm run build` (`nest build`) | `npm run start:prod` (migrate → `node dist/main.js`) |
| Simulator | Railway / Nixpacks (`railway.toml`) | `npm run build` | `node dist/server.js` |
| Frontend | Vercel | `next build` | `next start` (managed by Vercel) |

- Backend `railway.toml`: healthcheck `GET /health`, `restartPolicyType = ON_FAILURE`, max 3 retries.
- Simulator `railway.toml`: same restart policy (no healthcheck path defined).
- Backend binds to `0.0.0.0` (required for Railway container networking).

---

## 5. Database Schema & Seeding

Tool: **TypeORM migrations** (`synchronize: false` — schema is never auto-mutated from entities).

```bash
# Run all pending migrations (creates/updates schema)
npm run migration:run     --workspace=apps/backend
# Generate a new migration from entity changes
npm run migration:generate --workspace=apps/backend -- src/migrations/<Name>
# Revert the last migration
npm run migration:revert  --workspace=apps/backend
```

**Migrations run automatically on deploy.** The backend start command is `npm run start:prod`,
which runs `migration:run:prod` (TypeORM CLI against the compiled `dist/config/data-source.js`,
no `ts-node`) and then `node dist/main.js`. A fresh database gets its full schema on first boot
with no manual step.

**Auto-seed:** on boot, `main.ts` counts `customers` and `users`; if **both** are empty it seeds
demo data and an admin user. This is wrapped in try/catch and is non-fatal — if the tables do
not exist yet (migrations not run), the server still starts and logs a warning.

Current migrations (`apps/backend/src/migrations/`):

```
1718000000000-InitialSchema.ts
1718000000001-AddTrendInsightsAndCampaignReport.ts
1781460017055-AddTagsToCustomers.ts
```

---

## 6. The Channel Loop in Production

The two-service callback loop spans both Railway services:

1. Campaign launch → backend `campaign.send` BullMQ worker writes `Communication` rows and
   `POST`s each to `${SIMULATOR_URL}/send`.
2. Simulator returns `202` immediately and asynchronously fires lifecycle callbacks to
   `${CRM_CALLBACK_URL}` with header `X-Simulator-Secret`.
3. Backend `POST /api/callbacks/delivery` (guarded by `SimulatorSecretGuard`) enqueues to the
   `callback.process` queue → updates communication state (monotonic, out-of-order safe) →
   enqueues `analytics.compute` → dashboard funnel updates.

**Operational notes / known limits:**
- Callbacks are **at-most-once**: if the backend is unreachable the simulator logs and drops the
  event (no retry). Analytics are idempotent because they fully recompute from the DB.
- Both `SIMULATOR_SECRET` values **must match** across the two services or all callbacks 401.
- Free-tier Gemini is 15 RPM / 1,500 req/day — heavy live AI use can hit `429`.

---

## 7. Health & Monitoring

`GET /health` (unprefixed, excluded from the global `/api` prefix) returns:

```json
{ "status": "ok", "services": { "database": "ok", "redis": "ok" } }
```

`status` is `"degraded"` if any dependency check fails. Railway uses this as the backend
healthcheck. The simulator exposes its own `GET /health` returning
`{ "status": "ok", "service": "channel-simulator" }`.

| Surface | What it covers |
|---|---|
| `/health` (backend) | Postgres + Redis reachability |
| `/health` (simulator) | Process liveness |
| Sentry (if `SENTRY_DSN` set) | Unhandled exceptions via `@sentry/nestjs` global filter |
| Railway metrics | CPU / memory / restarts per service |
| Neon / Upstash consoles | DB storage + connections, Redis command quota |

---

## 8. Rollback

- **Frontend (Vercel):** redeploy any previous deployment from the dashboard (instant promote).
- **Backend / Simulator (Railway):** redeploy a previous build from the service's deploy history.
- **Database:** every migration ships a `down()`; run `migration:revert` for the last one.
  Prefer additive migrations (`ADD COLUMN`) over destructive ones.

---

## 9. Local Development

Prerequisites: Node 20+, Docker Desktop (local Postgres + Redis), Git.

```bash
git clone <repo> && cd customer360
npm install                       # installs all workspaces
docker compose up -d              # postgres:5432 + redis:6379 (docker-compose.yml)

cp apps/backend/.env.example          apps/backend/.env
cp apps/channel-simulator/.env.example apps/channel-simulator/.env
# create apps/frontend/.env.local with NEXT_PUBLIC_API_URL=http://localhost:3001

npm run migration:run --workspace=apps/backend     # create schema
# (seed runs automatically on first backend boot if DB is empty)

# 3 terminals:
npm run dev --workspace=apps/backend            # :3001
npm run dev --workspace=apps/channel-simulator  # :3002
npm run dev --workspace=apps/frontend           # :3000
```

`docker-compose.yml` (root of `customer360/`) provides `postgres:16-alpine` and `redis:7-alpine`.
