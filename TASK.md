# task.md — Customer360 AI CRM
> **Dream Underground CRM** | Implementation Roadmap (Agent Handoff Document)  
> Version: 1.0 | Last Updated: Stage 0  
> **IMPORTANT:** This document is updated at the end of every stage. Always read this before starting any new stage.

---

## How to Read This Document

- **Status**: `[ ]` = not started, `[x]` = complete, `[~]` = in progress, `[!]` = blocked
- **Priority**: P0 = must ship, P1 = should ship, P2 = nice to have
- Each task has an ID (e.g. `S1-T1`) for cross-referencing
- Dependencies listed explicitly — never start a task before its dependencies are complete

---

## Stage Completion Summary

| Stage | Name | Status | Completed At |
|---|---|---|---|
| Stage 0 | Documentation | `[x]` | Stage 0 |
| Stage 1 | Monorepo Scaffold + DB | `[ ]` | — |
| Stage 2 | Authentication | `[ ]` | — |
| Stage 3 | Data Ingestion | `[ ]` | — |
| Stage 4 | Customer 360 | `[ ]` | — |
| Stage 5 | Segmentation | `[x]` | Stage 5 |
| Stage 6 | Campaigns | `[x]` | Stage 6 |
| Stage 7 | Channel Simulator | `[x]` | Stage 7 |
| Stage 8 | Analytics Dashboard | `[x]` | Stage 8 |
| Stage 9 | AI Agents | `[ ]` | — |
| Stage 10 | Deployment | `[x]` | Stage 10 |

---

## Stage 0 — Documentation ✅

**Goal:** All 7 project documents created and confirmed by user.

| ID | Task | Status | Notes |
|---|---|---|---|
| S0-T1 | Create Arch.md | `[x]` | Includes Mermaid diagrams, ERD, agent workflow, queue architecture |
| S0-T2 | Create Prd.md | `[x]` | All 8 modules specified with acceptance criteria |
| S0-T3 | Create deployment.md | `[x]` | Env vars, CI/CD, migration strategy, rollback |
| S0-T4 | Create security.md | `[x]` | JWT, RBAC, XSS, CSRF, SQL injection, PII encryption |
| S0-T5 | Create notes.md | `[x]` | All 5 initial decisions + technical debt register |
| S0-T6 | Create task.md | `[x]` | This document |
| S0-T7 | Create readme.md | `[x]` | GitHub-ready README |
| S0-T8 | User confirms documents | `[x]` | User reviewed and approved Stage 0 |

---

## Stage 1 — Monorepo Scaffold + Database Schema

**Goal:** A running monorepo with all three apps scaffolded, DB connected, migrations applied, and seed data working. No business logic yet.

**Prerequisites:** Stage 0 complete, user has Node 20+ and Docker installed.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S1-T1 | Initialize npm workspaces monorepo at repo root | — | P0 | 0.5 | `[ ]` |
| S1-T2 | Scaffold NestJS backend app (`apps/backend`) | S1-T1 | P0 | 1 | `[ ]` |
| S1-T3 | Scaffold Next.js 15 frontend app (`apps/frontend`) | S1-T1 | P0 | 0.5 | `[ ]` |
| S1-T4 | Scaffold Fastify simulator app (`apps/channel-simulator`) | S1-T1 | P0 | 0.5 | `[ ]` |
| S1-T5 | Create `docker-compose.yml` (postgres + redis) at root | S1-T1 | P0 | 0.5 | `[ ]` |
| S1-T6 | Configure TypeORM in backend (connect to local PG) | S1-T2 | P0 | 1 | `[ ]` |
| S1-T7 | Create TypeORM entities for all DB tables (from Arch.md ERD) | S1-T6 | P0 | 3 | `[ ]` |
| S1-T8 | Generate and run initial migration (all tables) | S1-T7 | P0 | 1 | `[ ]` |
| S1-T9 | Create seed script: 100 sample customers + 500 orders | S1-T8 | P0 | 2 | `[ ]` |
| S1-T10 | Configure BullMQ in backend (connect to local Redis) | S1-T2 | P0 | 1 | `[ ]` |
| S1-T11 | Add `GET /health` endpoint (checks DB + Redis) | S1-T6 | P0 | 0.5 | `[ ]` |
| S1-T12 | Configure ESLint + Prettier across all workspaces | S1-T1 | P1 | 1 | `[ ]` |
| S1-T13 | Add `.env.example` files for all 3 apps | S1-T1 | P0 | 0.5 | `[ ]` |

**Manual Check Instructions (end of Stage 1):**
1. Run `docker compose up -d` → no errors
2. Run `npm run dev --workspace=apps/backend` → starts on :3001
3. Open `http://localhost:3001/health` → should return `{"status":"ok","services":{"database":"ok","redis":"ok"}}`
4. Connect to DB: `psql postgresql://postgres:postgres@localhost:5432/customer360`
5. Run `\dt` → should list all tables from the ERD
6. Run `SELECT count(*) FROM customers;` → should return 100
7. Run `SELECT count(*) FROM orders;` → should return 500

---

## Stage 2 — Authentication

**Goal:** Working register/login/logout with JWT HTTP-only cookies, RBAC guards on all routes.

**Prerequisites:** Stage 1 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S2-T1 | Create `AuthModule` with register endpoint | S1-T7 | P0 | 1 | `[ ]` |
| S2-T2 | Create login endpoint — bcrypt verify + JWT issue + HTTP-only cookie | S2-T1 | P0 | 1.5 | `[ ]` |
| S2-T3 | Create logout endpoint — Redis token blacklist | S2-T2 | P0 | 1 | `[ ]` |
| S2-T4 | Create `JwtAuthGuard` (validates token + checks blacklist) | S2-T2 | P0 | 1 | `[ ]` |
| S2-T5 | Create `RolesGuard` + `@Roles()` decorator | S2-T4 | P0 | 1 | `[ ]` |
| S2-T6 | Create CSRF double-submit guard | S2-T2 | P1 | 1 | `[ ]` |
| S2-T7 | Apply rate limiting (`@nestjs/throttler`) on login | S2-T2 | P0 | 0.5 | `[ ]` |
| S2-T8 | Create seed user: `admin@test.com` / `Admin123!` | S2-T1 | P0 | 0.5 | `[ ]` |
| S2-T9 | Frontend: login page (ShadCN form + API call) | S2-T2 | P0 | 2 | `[ ]` |
| S2-T10 | Frontend: auth context + cookie-based session check | S2-T9 | P0 | 1 | `[ ]` |
| S2-T11 | Frontend: protected route wrapper (redirect if not auth'd) | S2-T10 | P0 | 0.5 | `[ ]` |
| S2-T12 | Add audit log on login/logout/register | S2-T2 | P1 | 0.5 | `[ ]` |

**Manual Check Instructions (end of Stage 2):**
1. Open `http://localhost:3000` → should redirect to `/login`
2. Login with `admin@test.com` / `Admin123!` → should redirect to dashboard
3. Open DevTools → Application → Cookies → `access_token` cookie should be present, `HttpOnly` flag set
4. Try to access `http://localhost:3001/api/customers` without cookie → should return 401
5. Try login 11 times with wrong password → should return 429 on 11th attempt
6. Logout → cookie cleared → redirect to login

---

## Stage 3 — Customer & Order Data Ingestion

**Goal:** Upload a CSV/Excel file, AI detects schema, normalizes data, deduplicates, imports records.

**Prerequisites:** Stage 2 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S3-T1 | Configure UploadThing in backend + frontend | S2-T4 | P0 | 1 | `[ ]` |
| S3-T2 | Create `UploadModule` with `POST /upload` endpoint | S3-T1 | P0 | 1 | `[ ]` |
| S3-T3 | File validation (MIME, size, magic bytes) | S3-T2 | P0 | 1 | `[ ]` |
| S3-T4 | CSV parser (using `csv-parse`) | S3-T2 | P0 | 1 | `[ ]` |
| S3-T5 | Excel parser (using `xlsx` / `exceljs`) | S3-T2 | P0 | 1 | `[ ]` |
| S3-T6 | BullMQ `upload.process` queue + UploadWorker | S3-T2 | P0 | 1.5 | `[ ]` |
| S3-T7 | DataCleaningAgent — schema detection (Gemini call) | S3-T6 | P0 | 2 | `[ ]` |
| S3-T8 | Column normalization (phone E.164, email lowercase) | S3-T7 | P0 | 1.5 | `[ ]` |
| S3-T9 | Deduplication engine (exact email/phone + fuzzy name) | S3-T8 | P0 | 3 | `[ ]` |
| S3-T10 | Customer merge: create canonical record + identity_map rows | S3-T9 | P0 | 2 | `[ ]` |
| S3-T11 | Order ingestion: link orders to canonical customers | S3-T10 | P0 | 1.5 | `[ ]` |
| S3-T12 | Upload job status SSE endpoint (`GET /upload/:id/status`) | S3-T6 | P0 | 1 | `[ ]` |
| S3-T13 | Frontend: upload page with drag-and-drop + progress | S3-T12 | P0 | 2 | `[ ]` |
| S3-T14 | Frontend: schema review step (show detected mapping) | S3-T13 | P1 | 2 | `[ ]` |
| S3-T15 | Frontend: upload completion summary card | S3-T14 | P0 | 1 | `[ ]` |

**Manual Check Instructions (end of Stage 3):**
1. Download sample customer CSV from `/seed/sample_customers.csv`
2. Upload it via the upload page → progress bar shows
3. Wait for completion → summary shows "100 records imported, X duplicates merged"
4. Go to Customers list → should show records
5. Check `customer_identity_map` table — rows should be present for merged records
6. Try uploading a `.exe` file → should be rejected with error message

---

## Stage 4 — Customer 360 Profile

**Goal:** Customer list page and full 360 profile view with computed fields.

**Prerequisites:** Stage 3 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S4-T1 | `CustomerIntelligenceAgent` — compute CLV + engagement score | S3-T10 | P0 | 2 | `[ ]` |
| S4-T2 | Preferred channel detection (from communications history or default) | S4-T1 | P1 | 1 | `[ ]` |
| S4-T3 | Customer tag assignment (champion/at-risk/etc.) | S4-T1 | P1 | 1 | `[ ]` |
| S4-T4 | `GET /customers` — paginated list with search + sort | S3-T10 | P0 | 1.5 | `[ ]` |
| S4-T5 | `GET /customers/:id` — full 360 profile with orders | S3-T10 | P0 | 1 | `[ ]` |
| S4-T6 | Frontend: customer list page (table + search + sort) | S4-T4 | P0 | 2 | `[ ]` |
| S4-T7 | Frontend: customer detail page (profile card + order timeline) | S4-T5 | P0 | 3 | `[ ]` |
| S4-T8 | Frontend: customer tags display + filter by tag | S4-T3 | P1 | 1 | `[ ]` |

**Manual Check Instructions (end of Stage 4):**
1. Open Customers page → list shows with name, email, spend, last order
2. Click a customer → 360 profile page loads
3. Profile shows: engagement score, CLV, total spend, order count, last order date, order list
4. Search for customer by name → filters correctly
5. Sort by Total Spend → correctly sorted

---

## Stage 5 — Audience Segmentation

**Goal:** Manual filter segmentation + AI natural language segmentation both working.

**Prerequisites:** Stage 4 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S5-T1 | `SegmentModule` — `POST /segments` with filter DSL | S4-T4 | P0 | 2 | `[x]` |
| S5-T2 | Filter executor: FilterAST → TypeORM query | S5-T1 | P0 | 2.5 | `[x]` |
| S5-T3 | Segment membership population (BullMQ `segment.compute`) | S5-T2 | P0 | 1.5 | `[x]` |
| S5-T4 | `SegmentationAgent` — NL query → FilterAST (LangGraph node) | S5-T2 | P0 | 3 | `[x]` |
| S5-T5 | `POST /segments/ai-generate` — NL input → returns filter + preview count | S5-T4 | P0 | 1 | `[x]` |
| S5-T6 | `GET /segments` — list all segments with member count | S5-T3 | P0 | 0.5 | `[x]` |
| S5-T7 | `GET /segments/:id/members` — paginated member list | S5-T3 | P0 | 1 | `[x]` |
| S5-T8 | `POST /segments/:id/recompute` — refresh segment members | S5-T3 | P1 | 0.5 | `[x]` |
| S5-T9 | Frontend: segment builder (filter UI with AND/OR logic) | S5-T1 | P0 | 4 | `[x]` |
| S5-T10 | Frontend: AI segment input + preview | S5-T5 | P0 | 2 | `[x]` |
| S5-T11 | Frontend: segment list + detail page | S5-T6 | P0 | 1.5 | `[x]` |

**Manual Check Instructions (end of Stage 5):**
1. Create manual segment: `total_spend > 500 AND order_count > 2` → correct count shown
2. Create AI segment: type "Customers who haven't purchased in 30 days" → segment created
3. View segment members → list shows matching customers
4. Upload new customer CSV → recompute segment → count updates
5. Try creating segment with 0 results → show "No customers match"

---

## Stage 6 — Campaign Builder + AI Generator

**Goal:** Create, schedule, and launch campaigns. AI campaign generator works.

**Prerequisites:** Stage 5 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S6-T1 | `CampaignModule` — `POST /campaigns` | S5-T3 | P0 | 1.5 | `[x]` |
| S6-T2 | Campaign state machine (draft→scheduled→running→completed) | S6-T1 | P0 | 1 | `[x]` |
| S6-T3 | `POST /campaigns/:id/launch` — validates + enqueues `campaign.send` | S6-T2 | P0 | 1.5 | `[x]` |
| S6-T4 | `CampaignSendWorker` — batch send to channel simulator | S6-T3 | P0 | 2.5 | `[x]` |
| S6-T5 | Message personalization (`{{customer.name}}` variable replacement) | S6-T4 | P0 | 1 | `[x]` |
| S6-T6 | `CampaignAgent` — goal → segment + message + channel (LangGraph) | S6-T1 | P0 | 3 | `[x]` |
| S6-T7 | `POST /campaigns/ai-generate` — returns structured suggestion | S6-T6 | P0 | 1 | `[x]` |
| S6-T8 | Frontend: campaign list page | S6-T1 | P0 | 1 | `[x]` |
| S6-T9 | Frontend: campaign builder form | S6-T1 | P0 | 3 | `[x]` |
| S6-T10 | Frontend: AI campaign generator drawer | S6-T7 | P0 | 2 | `[x]` |
| S6-T11 | Frontend: launch confirmation dialog | S6-T3 | P0 | 1 | `[x]` |
| S6-T12 | Frontend: campaign detail page with live progress counter | S6-T4 | P0 | 2 | `[x]` |


**Manual Check Instructions (end of Stage 6):**
1. Create a campaign manually: pick a segment, channel = WhatsApp, write message, click Launch
2. Campaign status changes to "Running"
3. Check `communications` table → rows with `status = sent` exist
4. Open AI Campaign Generator → type "Bring back inactive customers" → suggestion appears
5. Click "Use This Campaign" → form pre-filled with suggestion

---

## Stage 7 — Channel Simulator + Callbacks

**Goal:** Simulator fires async delivery/open/click callbacks. CRM updates communication status in real-time.

**Prerequisites:** Stage 6 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S7-T1 | Fastify simulator: `POST /send` route | S6-T4 | P0 | 1.5 | `[x]` |
| S7-T2 | Simulator outcome engine (probability table per channel) | S7-T1 | P0 | 2 | `[x]` |
| S7-T3 | Simulator callback dispatcher (HTTP POST to CRM) | S7-T2 | P0 | 1.5 | `[x]` |
| S7-T4 | Staggered event firing: delivered → opened (+30s) → clicked (+60s) | S7-T3 | P0 | 1 | `[x]` |
| S7-T5 | CRM: `POST /callbacks/delivery` endpoint + `SimulatorSecretGuard` | S7-T3 | P0 | 1 | `[x]` |
| S7-T6 | `CallbackWorker` — update `communications.status` | S7-T5 | P0 | 1.5 | `[x]` |
| S7-T7 | Race condition protection: terminal status not overwritten | S7-T6 | P0 | 0.5 | `[x]` |
| S7-T8 | `analytics.compute` queue trigger on campaign completion | S7-T6 | P0 | 1 | `[x]` |
| S7-T9 | `AnalyticsWorker` — aggregate `campaign_analytics` table | S7-T8 | P0 | 1.5 | `[x]` |

**Manual Check Instructions (end of Stage 7):**
1. Launch a campaign
2. Watch `communications` table — `status` should change from `sent` → `delivered` within 15 seconds
3. Wait 30 more seconds — some rows should show `opened`
4. Wait 30 more seconds — some rows should show `clicked`
5. Verify `campaign_analytics` counters increment correctly
6. Try sending a request to `/callbacks/delivery` without the `X-Simulator-Secret` header → should return 401

---

## Stage 8 — Analytics Dashboard

**Goal:** Working charts: funnel, time-series, channel comparison. Live campaign metrics.

**Prerequisites:** Stage 7 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S8-T1 | `AnalyticsModule` — `GET /analytics/:campaignId` | S7-T9 | P0 | 1 | `[x]` |
| S8-T2 | `GET /analytics/dashboard` — aggregate home metrics | S7-T9 | P0 | 1 | `[x]` |
| S8-T3 | `GET /analytics/:campaignId/timeseries` — events over time | S8-T1 | P1 | 1.5 | `[x]` |
| S8-T4 | `GET /analytics/channels` — cross-campaign channel comparison | S8-T1 | P1 | 1 | `[x]` |
| S8-T5 | Frontend: analytics dashboard home (4 KPI cards) | S8-T2 | P0 | 1.5 | `[x]` |
| S8-T6 | Frontend: campaign funnel chart (Recharts) | S8-T1 | P0 | 2 | `[x]` |
| S8-T7 | Frontend: time-series chart per campaign | S8-T3 | P1 | 2 | `[x]` |
| S8-T8 | Frontend: channel comparison bar chart | S8-T4 | P1 | 2 | `[x]` |
| S8-T9 | Live updates: polling or SSE for active campaign metrics | S8-T1 | P0 | 1.5 | `[x]` |

**Manual Check Instructions (end of Stage 8):**
1. Open Analytics dashboard → 4 KPI cards visible (customers, segments, campaigns, best campaign)
2. Click a completed campaign → funnel chart shows sent/delivered/opened/clicked/converted
3. Verify conversion rate = converted / clicked (displayed as %)
4. Delivery rate = delivered / sent visible on campaign page
5. While campaign is running, metrics should auto-update every ~10 seconds

---

## Stage 9 — Full AI Agent Integration

**Goal:** All LangGraph agents wired end-to-end. Trend Intelligence working. Agent workflow observable.

**Prerequisites:** Stage 8 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S9-T1 | `AgentModule` + LangGraph StateGraph setup | S2-T4 | P0 | 2 | `[ ]` |
| S9-T2 | `TrendAgent` — daily cron via BullMQ | S9-T1 | P1 | 2 | `[ ]` |
| S9-T3 | `AnalyticsAgent` — post-campaign summary + suggestions | S9-T1 | P1 | 2 | `[ ]` |
| S9-T4 | Wire all agents into shared StateGraph with task router | S9-T1 | P0 | 3 | `[ ]` |
| S9-T5 | Frontend: trend insights page with notification bell | S9-T2 | P1 | 2 | `[ ]` |
| S9-T6 | Frontend: "Create campaign from insight" button | S9-T5 | P1 | 1 | `[ ]` |
| S9-T7 | Frontend: AI assistant panel (optional chat interface) | S9-T4 | P2 | 3 | `[ ]` |

**Manual Check Instructions (end of Stage 9):**
1. Trigger trend scan manually via `POST /agents/trend/trigger` → returns insights
2. View Trends page → insights visible with timestamps
3. Click "Create campaign from insight" → Campaign Builder pre-filled
4. Run full end-to-end: upload data → segment → AI-generate campaign → launch → view analytics

---

## Stage 10 — Deployment

**Goal:** Live, publicly accessible deployment on Vercel + Railway.

**Prerequisites:** Stage 9 complete.

| ID | Task | Deps | Priority | Est. Hours | Status |
|---|---|---|---|---|---|
| S10-T1 | Set up Neon PostgreSQL database (production) | — | P0 | 0.5 | `[x]` |
| S10-T2 | Set up Upstash Redis (production) | — | P0 | 0.5 | `[x]` |
| S10-T3 | Set up Railway project with backend + simulator services | — | P0 | 1 | `[x]` |
| S10-T4 | Configure all production env vars on Railway | S10-T3 | P0 | 1 | `[x]` |
| S10-T5 | Run migrations on Neon production DB | S10-T4 | P0 | 0.5 | `[x]` |
| S10-T6 | Seed production DB with sample data | S10-T5 | P0 | 0.5 | `[x]` |
| S10-T7 | Deploy backend to Railway + verify health endpoint | S10-T4 | P0 | 1 | `[x]` |
| S10-T8 | Deploy simulator to Railway + verify `/send` route | S10-T3 | P0 | 0.5 | `[x]` |
| S10-T9 | Set up Vercel project + configure env vars | — | P0 | 0.5 | `[x]` |
| S10-T10 | Deploy frontend to Vercel + verify login works | S10-T9 | P0 | 0.5 | `[x]` |
| S10-T11 | Set up GitHub Actions CI/CD (from deployment.md) | — | P1 | 2 | `[~]` |
| S10-T12 | Configure Sentry (frontend + backend) | — | P1 | 1 | `[x]` |
| S10-T13 | Full end-to-end smoke test on production | S10-T10 | P0 | 1 | `[ ]` |
| S10-T14 | Record walkthrough video | S10-T13 | P0 | 1.5 | `[ ]` |

**Manual Check Instructions (end of Stage 10):**
1. Open Vercel URL → login page loads
2. Login with seeded credentials → dashboard accessible
3. Upload sample CSV → records imported
4. Create segment → members counted
5. Launch campaign → delivery callbacks fire
6. View analytics → funnel chart shows data
7. Test health endpoint: `https://api.customer360.railway.app/health` → `{"status":"ok"}`

---

## Appendix: File Structure Reference

```
customer360/
├── package.json                    # npm workspaces root
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docker-compose.yml
├── docs/
│   ├── Arch.md
│   ├── Prd.md
│   ├── deployment.md
│   ├── security.md
│   ├── notes.md
│   ├── task.md
│   └── readme.md
├── apps/
│   ├── frontend/                   # Next.js 15
│   ├── backend/                    # NestJS
│   └── channel-simulator/          # Fastify
└── seed/
    ├── sample_customers.csv
    └── sample_orders.csv
```