# Customer360 AI CRM

> An AI-native shopper marketing CRM — built for brands to decide **who to talk to**, **what to say**, and **how to reach them**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/customer360)

---

## Overview

Customer360 is a full-stack, AI-native marketing CRM designed for D2C and retail brands. It ingests customer and order data, deduplicates and unifies customer profiles, enables AI-powered audience segmentation, generates personalized campaigns, simulates multi-channel message delivery, and surfaces real-time analytics — all powered by a multi-agent LangGraph.js system.

This is a **shopper marketing CRM** — not a sales CRM. There are no pipelines, leads, or support tickets.

---

## Features

### Core
- **Smart Data Upload** — Upload customer and order CSVs/Excel files. AI auto-detects schema, normalizes phone numbers and emails, and deduplicates records using fuzzy matching
- **Customer 360 Profiles** — Unified profiles with total spend, CLV, engagement score, preferred channel, and full order history
- **Audience Segmentation** — Build segments with filter UI or describe your audience in plain English ("customers who spent > ₹5000 and haven't purchased in 60 days")
- **Campaign Builder** — Create multi-channel campaigns (WhatsApp, SMS, Email, RCS) with message personalization variables
- **AI Campaign Generator** — Describe a goal, get a complete campaign suggestion (audience + message + channel) from AI

### AI-Powered
- **Multi-Agent Architecture** — 6 LangGraph.js agents: Data Cleaning, Customer Intelligence, Segmentation, Campaign, Trend, Analytics
- **Natural Language Segmentation** — Type any audience description, get a runnable segment
- **Trend Intelligence** — Daily AI scan of campaign patterns and engagement signals

### Delivery & Analytics
- **Channel Simulator** — Separate Fastify microservice that simulates async delivery lifecycle (sent → delivered → opened → clicked → converted)
- **Real-time Analytics** — Funnel charts, time-series, channel comparison — updated live as callbacks arrive
- **Delivery Callbacks** — Event-driven architecture with BullMQ-processed callbacks

---

## Architecture

```
┌──────────┐    ┌──────────────────┐    ┌──────────────┐
│ Next.js  │    │    NestJS API    │    │   Fastify    │
│ Frontend │◄──►│  + LangGraph.js  │───►│  Simulator   │
└──────────┘    │  + BullMQ        │    └──────┬───────┘
                └────────┬─────────┘           │
                         │             async callbacks
              ┌──────────┼──────────┐          │
              ▼          ▼          ▼          │
         ┌─────────┐ ┌───────┐ ┌───────┐      │
         │  Neon   │ │Upstash│ │Gemini │      │
         │  (PG)   │ │(Redis)│ │ GPT-4o│◄─────┘
         └─────────┘ └───────┘ └───────┘
```

Full architecture diagram, ERD, agent workflow, and sequence diagrams: see [`docs/Arch.md`](docs/Arch.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, ShadCN UI, Recharts |
| Backend | NestJS, Node.js, TypeORM |
| Channel Simulator | Fastify |
| Database | Neon PostgreSQL |
| Cache / Queue | Upstash Redis, BullMQ |
| AI | Google Gemini 2.0 Flash (free tier), LangGraph.js |
| Auth | JWT + HTTP-only cookies |
| Storage | UploadThing |
| Deployment | Vercel (frontend), Railway (backend + simulator) |
| Monitoring | Sentry, PostHog |

---

## Project Structure

```
customer360/
├── apps/
│   ├── frontend/              # Next.js 15 (port 3000)
│   ├── backend/               # NestJS (port 3001)
│   └── channel-simulator/     # Fastify (port 3002)
├── docs/
│   ├── Arch.md                # Architecture diagrams + decisions
│   ├── Prd.md                 # Product requirements + acceptance criteria
│   ├── deployment.md          # Deployment guide + CI/CD
│   ├── security.md            # Security architecture
│   ├── notes.md               # Design decisions + technical debt
│   ├── task.md                # Implementation roadmap
│   └── readme.md              # This file
├── seed/
│   ├── sample_customers.csv   # Sample data for testing
│   └── sample_orders.csv
├── docker-compose.yml         # Local postgres + redis
└── package.json               # npm workspaces root
```

---

## Setup

### Prerequisites

- Node.js 20+
- Docker Desktop
- npm 9+

### 1. Clone

```bash
git clone https://github.com/your-org/customer360.git
cd customer360
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
cp apps/channel-simulator/.env.example apps/channel-simulator/.env
```

Edit each `.env` file — the only required fields for local dev are already pre-filled in `.env.example`.

You will need to add your own `GEMINI_API_KEY` in `apps/backend/.env`. Get it free (no credit card) from [Google AI Studio](https://aistudio.google.com).

### 4. Start local services (Postgres + Redis)

```bash
docker compose up -d
```

### 5. Run database migrations

```bash
npm run migration:run --workspace=apps/backend
```

### 6. Seed sample data

```bash
npm run seed --workspace=apps/backend
```

### 7. Start all services

Open 3 terminal tabs:

```bash
# Terminal 1
npm run dev --workspace=apps/frontend
# → http://localhost:3000

# Terminal 2
npm run dev --workspace=apps/backend
# → http://localhost:3001

# Terminal 3
npm run dev --workspace=apps/channel-simulator
# → http://localhost:3002
```

### 8. Log in

Open `http://localhost:3000` and log in with:

```
Email:    admin@customer360.com
Password: Admin123!
```

---

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon/Postgres connection string | ✅ |
| `REDIS_URL` | Upstash/Redis connection string | ✅ |
| `JWT_SECRET` | 64-char random string | ✅ |
| `GEMINI_API_KEY` | Google AI Studio API key (free at aistudio.google.com) | ✅ |
| `GEMINI_MODEL` | Gemini model string — use `gemini-2.0-flash` | ✅ |
| `CHANNEL_SIMULATOR_URL` | URL of simulator service | ✅ |
| `CHANNEL_SIMULATOR_SECRET` | Shared secret with simulator | ✅ |
| `CRM_CALLBACK_URL` | URL of this service's callback endpoint | ✅ |
| `UPLOADTHING_SECRET` | UploadThing secret key | ✅ |
| `ENCRYPTION_KEY` | 32-byte hex key for PII encryption | ✅ |
| `SENTRY_DSN` | Sentry DSN for error tracking | Optional |

### Frontend (`apps/frontend/.env`)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | ✅ |
| `UPLOADTHING_SECRET` | UploadThing secret | ✅ |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | Optional |

### Simulator (`apps/channel-simulator/.env`)

| Variable | Description | Required |
|---|---|---|
| `CRM_CALLBACK_URL` | URL to fire delivery callbacks to | ✅ |
| `SIMULATOR_SECRET` | Shared secret, sent in `X-Simulator-Secret` header | ✅ |

---

## Deployment

Full deployment guide with CI/CD pipeline: see [`docs/deployment.md`](docs/deployment.md)

**Quick summary:**
- Frontend → Vercel (auto-deploy from `main` branch)
- Backend → Railway
- Channel Simulator → Railway (separate service in same project)
- Database → Neon PostgreSQL
- Redis → Upstash

---

## API Overview

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user (admin only) |
| POST | `/api/auth/login` | Login → sets HTTP-only cookie |
| POST | `/api/auth/logout` | Logout → clears cookie |

### Customers
| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | List customers (paginated, searchable) |
| GET | `/api/customers/:id` | Get 360 profile |

### Upload
| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Upload customer or order file |
| GET | `/api/upload/:id/status` | Poll upload job status (SSE) |

### Segments
| Method | Path | Description |
|---|---|---|
| GET | `/api/segments` | List all segments |
| POST | `/api/segments` | Create segment with filter DSL |
| POST | `/api/segments/ai-generate` | NL query → segment preview |
| GET | `/api/segments/:id/members` | List segment members |
| POST | `/api/segments/:id/recompute` | Refresh segment membership |

### Campaigns
| Method | Path | Description |
|---|---|---|
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/ai-generate` | Goal → campaign suggestion |
| POST | `/api/campaigns/:id/launch` | Launch campaign |
| GET | `/api/campaigns/:id` | Campaign detail + live progress |

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Home dashboard metrics |
| GET | `/api/analytics/:campaignId` | Campaign metrics (funnel) |
| GET | `/api/analytics/:campaignId/timeseries` | Events over time |
| GET | `/api/analytics/channels` | Cross-channel comparison |

### Callbacks (Simulator → CRM)
| Method | Path | Description |
|---|---|---|
| POST | `/api/callbacks/delivery` | Delivery event callback (auth: shared secret) |

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health check |

---

## Screenshots

> _Screenshots will be added after Stage 8 (Analytics Dashboard) is complete._

| Screen | Preview |
|---|---|
| Login | _(placeholder)_ |
| Dashboard | _(placeholder)_ |
| Customer 360 | _(placeholder)_ |
| Segment Builder | _(placeholder)_ |
| AI Segment | _(placeholder)_ |
| Campaign Builder | _(placeholder)_ |
| AI Campaign Generator | _(placeholder)_ |
| Analytics Dashboard | _(placeholder)_ |

---

## Documentation

| Document | Description |
|---|---|
| [`Arch.md`](docs/Arch.md) | System architecture, ERD, sequence diagrams, agent workflow |
| [`Prd.md`](docs/Prd.md) | Full product requirements with acceptance criteria |
| [`deployment.md`](docs/deployment.md) | Deployment guide, CI/CD, env vars, rollback strategy |
| [`security.md`](docs/security.md) | JWT, RBAC, XSS/CSRF/SQLi prevention, PII encryption |
| [`notes.md`](docs/notes.md) | Design decisions, tradeoffs, technical debt |
| [`task.md`](docs/task.md) | Stage-by-stage implementation roadmap |

---

## License

MIT