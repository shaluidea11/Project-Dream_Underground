# notes.md — Customer360 AI CRM
> **Dream Underground CRM** | Design Decisions & Architectural Log  
> Version: 1.0 | Last Updated: Stage 0

---

## ⚠️ How This File Works

This file is the **living decision log** for the project. Every time an architectural decision changes during development, the change is recorded here under "Decision Log." The next stage always reads this file before proceeding.

**Format for new entries:**
```
### [STAGE X] Decision: <title>
- **What changed:** ...
- **Why:** ...
- **Impact on other docs:** ...
- **Date:** ...
```

---

## 1. Initial Design Decisions (Stage 0)

### Decision: Channel Simulator uses Fastify, not NestJS

**Rationale:** The simulator is a stub service — it has exactly 1 route (`POST /send`) and one outgoing HTTP call (callback). NestJS's DI system, decorators, and module architecture add significant boilerplate for zero benefit here. Fastify provides a minimal HTTP server with excellent performance and schema validation via `@fastify/ajv-compiler`. This keeps the simulator deployable independently and auditable in < 200 lines.

**Tradeoff accepted:** The team must context-switch between NestJS (backend) and Fastify (simulator). Mitigated by keeping simulator code extremely simple.

---

### Decision: LangGraph.js over Python LangGraph sidecar

**Rationale:** Confirmed via research (April 2026 sources) that LangGraph.js now has feature parity with Python for: StateGraph, conditional edges, checkpointing, streaming, and human-in-the-loop. Using LangGraph.js keeps the entire platform in a single language/runtime, eliminates Python infrastructure (no venv, no separate service, no inter-service HTTP calls for agent orchestration), and simplifies deployment to a single Railway backend service.

**Tradeoff accepted:** The JS ecosystem for ML/AI tooling is historically less mature than Python. If advanced LangGraph features (e.g. LangSmith tracing, LangGraph Platform deployment) are needed later, migrating to Python becomes necessary. This is accepted for v1.

---

### Decision: npm workspaces over Turborepo/pnpm

**Rationale:** npm workspaces are built into npm 7+, require no additional tooling installation, and are sufficient for a 3-package monorepo. Turborepo's build caching and task pipelines add meaningful value at 10+ packages. pnpm is faster for large installs but introduces a non-standard node_modules layout that can cause confusion with some NestJS packages. For a hackathon-grade submission with a tight timeline, npm workspaces reduce cognitive overhead.

**Tradeoff accepted:** Build times will be slower than Turborepo for large monorepos. Acceptable for 3 packages.

---

### Decision: Neon PostgreSQL over Supabase

**Rationale:** Neon provides a pure PostgreSQL connection string — no Supabase SDK, no RLS policies, no auth layer coupling. TypeORM works against it identically to local Postgres. Supabase would add a parallel auth system (conflicting with the JWT strategy) and RLS complexity. Neon's serverless branching feature is also useful for creating a staging DB branch from production data.

**Tradeoff accepted:** Neon free tier (512MB) may be limiting for realistic 100k customer + 1M order seeding. Mitigation: seed data is generated with compact rows, compressed indexes.

---

### Decision: PII stored encrypted with SHA-256 hash for search

**Rationale:** Storing raw PII (email, phone, name) in plaintext in the DB creates a data breach risk. AES-256-GCM encryption at application layer protects data at rest. Since encrypted columns can't be indexed or searched, a separate SHA-256 hash of the normalized value is stored for lookup operations. This is a standard pattern (e.g. used by Stripe for hashed email lookups).

**Tradeoff accepted:** More complex read/write path. Every customer read must call `decrypt()`. For 100k customers this is acceptable; for 10M+ it would require a different approach (field-level encryption at DB layer, or a HSM-backed KMS).

---

### Decision: AI segmentation generates FilterAST, not raw SQL

**Rationale:** Allowing the LLM to generate raw SQL and execute it is a critical SQL injection vector — even if the SQL appears benign, a sufficiently creative prompt could exfiltrate data or perform destructive operations. Instead, the agent generates a typed `FilterAST` (a structured JSON representing filter conditions). The backend converts this AST to TypeORM query builder calls using a hardcoded field/operator whitelist. The LLM never touches SQL.

**Security implication:** This is a deliberate security boundary. Documented here so it is never relaxed without explicit review.

---

### Decision: Separate `campaign_analytics` table vs. real-time aggregation

**Rationale:** Running `COUNT(*) WHERE campaign_id = X AND status = 'delivered'` on the `communications` table in real-time for a 10k-send campaign is a full table scan on every dashboard refresh. Instead, `campaign_analytics` stores pre-aggregated counters that are incremented by the `CallbackWorker` on each delivery event. This reduces analytics reads to a single-row lookup.

**Tradeoff accepted:** Slight inconsistency window (analytics lag by ~1 callback processing delay). Acceptable for marketing dashboards.

---

### Decision: No multi-tenancy in v1

**Rationale:** Xeno's assignment is scoped to a single brand. Adding multi-tenancy (row-level tenant isolation, per-tenant encryption keys, subdomain routing) would triple the schema complexity and add 2+ weeks of development. This is explicitly called out as out of scope.

**Future path:** Multi-tenancy via PostgreSQL row-level security + `tenant_id` column on all tables. JWT would include `tenantId` claim. All queries add `WHERE tenant_id = :tenantId` automatically via a TypeORM subscriber.

---

## 2. Technical Debt Register

| ID | Debt Item | Impact | Priority | Mitigation Path |
|---|---|---|---|---|
| TD-01 | No automated test suite (unit + e2e) | High regression risk | High | Add Jest unit tests for services, Supertest e2e tests for controllers |
| TD-02 | PII decryption happens in-process (no KMS) | Key rotation is manual, risky | Medium | Migrate to AWS KMS or Vault for key management |
| TD-03 | Trend agent uses no real external data source | Insights are LLM-hallucinated, not factual | Medium | Integrate Google Trends API or industry news feeds |
| TD-04 | No message queue for callback events (single Redis) | Upstash free tier rate limits | Medium | Add dedicated BullMQ queue with backpressure |
| TD-05 | Engagement score computed post-hoc, not streaming | Score lags by one campaign | Low | Compute incrementally using Redis counters, sync to DB async |
| TD-06 | No audit log retention policy | Audit table grows unbounded | Low | Add `createdAt < NOW() - INTERVAL '90 days'` purge cron |
| TD-07 | LangGraph.js checkpointing uses in-memory store | Agent state lost on restart | Medium | Migrate to `@langchain/langgraph-checkpoint-postgres` |

---

## 3. Future Improvements (Post-v1)

**Short term (next sprint):**
- A/B testing: split campaign audience, track variant performance
- Message templates library (reusable templates per channel)
- Segment overlap analysis ("How many customers are in both segments?")

**Medium term:**
- Real channel integration (Twilio/MSG91) behind a feature flag
- Webhook inbound: receive real order events from Shopify/WooCommerce
- Customer data platform (CDP) export: push segments to Meta/Google Ads

**Long term:**
- Multi-tenancy (multiple brands on one platform)
- AI-driven send-time optimization ("Send to Priya at 7pm — she always opens WhatsApp then")
- Predictive churn scoring (ML model trained on order history)
- Revenue attribution (track order IDs from campaign clicks)

---

## 4. Interview Discussion Points

These are areas the Xeno team will likely probe. Prepare answers for:

1. **"Why Fastify for the simulator and not NestJS?"**  
   Answer: Discussed above. Single route, no DI needed, < 200 lines.

2. **"How does your deduplication handle conflicts — what if two records have same phone but different emails?"**  
   Answer: Phone match takes priority over email mismatch. AI decides for fuzzy name matches. All source records preserved in `customer_identity_map`.

3. **"If campaign sends scale to 1M/day, what breaks first?"**  
   Answer: BullMQ concurrency limit. Solution: horizontal scaling of workers, rate-limiter on simulator calls, batch DB inserts instead of per-record inserts.

4. **"How do you prevent the SegmentationAgent from generating malicious SQL?"**  
   Answer: It doesn't generate SQL. It generates a FilterAST. The backend converts AST to TypeORM parameterized queries using a field/operator whitelist.

5. **"What's the race condition risk in callback processing?"**  
   Answer: Two callbacks for the same `communicationId` can arrive simultaneously. Mitigated by: `UPDATE communications SET status = $1 WHERE id = $2 AND status != 'converted'` (terminal state never overwritten) + `ON CONFLICT DO NOTHING` on analytics increments.

6. **"How do you handle the LLM being slow for segmentation?"**  
   Answer: Cache the filter AST by NL query hash (Redis, 5 min TTL). Same query string returns cached segment instantly. LLM timeout fallback: return error asking user to simplify the query.

---

## 5. Decision Log (Updated Per Stage)

_This section is appended at the end of each stage by the agent. Starts empty._

| Stage | Decision Made | Reason | Affected Docs |
|---|---|---|---|
| 0 | Use Fastify for simulator | Thin service, no DI needed | Arch.md, deployment.md |
| 0 | Use LangGraph.js (not Python) | Feature parity confirmed, pure Node stack | Arch.md |
| 0 | Use npm workspaces | Zero overhead, sufficient for 3 packages | Arch.md, deployment.md |
| 0 | FilterAST pattern for AI segmentation | Security: prevent LLM SQL injection | Arch.md, security.md |
| 0 | Neon over Supabase | Avoids auth/RLS coupling, pure PG | deployment.md |
| 5-pre | Switch LLM from OpenAI GPT-4o → Gemini 2.0 Flash | No OpenAI API key available; Gemini free tier sufficient | Arch.md, deployment.md, security.md, readme.md, AGENT_PROMPT.md |
| 5-pre | Standardise FilterAST key as `"op"` not `"operator"` | Prevent silent executor mismatch; security.md already used `node.op` | Arch.md §5.5, security.md §3 |
| 5-pre | Remove `tags` from FilterAST field whitelist (Option A) | No `tags` column exists in `customers` table; deferred to future migration | Arch.md §5.5 |
| 5-pre | `POST /segments/ai-generate` declared before `/:id` routes | NestJS greedy param matching would swallow the route string | Arch.md §5.5, agent instructions |
| 6 | Direct Gemini SDK for Campaign Proposal Generation | Reused direct @google/generative-ai SDK pattern from Stage 5 for speed and dependency minimization | campaigns.service.ts, campaign-agent.service.ts |
| 7 | Configurable Speed Up in Simulator & Status Preferences | Enabled SIMULATOR_DELAY_SCALE for manual testing and STATUS_PREFERENCE scoring logic for out-of-order callback protection | server.ts, callback.worker.ts |
| 8 | Recharts and Controller Route Order for Analytics | Used Recharts on frontend for data visualization and ordered controller routes to prevent NestJS route collisions | analytics.controller.ts, page.tsx |
| 10 | DATABASE_URL + REDIS_URL support for production | Neon/Upstash provide connection strings; fallback to individual vars for local Docker dev | data-source.ts, app.module.ts |
| 10 | Sentry NestJS integration | @sentry/nestjs with SentryModule + SentryGlobalFilter for production error tracking | instrument.ts, app.module.ts, main.ts |
| 10 | Railway Dockerfiles + railway.toml | Multi-stage Docker builds for backend, single-stage for simulator, Nixpacks config | Dockerfile, railway.toml |
| 10 | Backend binds to 0.0.0.0 | Railway requires container-accessible binding, not localhost-only | main.ts |

---

### [Stage 8] Decision: Recharts and Controller Route Order for Analytics

- **What changed:**
  1. Frontend: Used Recharts library on frontend for rendering cumulative events time-series, channel comparison, and campaign funnel.
  2. Backend: Structured NestJS routes in `analytics.controller.ts` so that literal paths `/analytics/dashboard` and `/analytics/channels` are registered BEFORE the parameter-based path `/analytics/:campaignId` (and `/analytics/:campaignId/timeseries`).
- **Why:**
  1. Recharts provides highly customizable, component-based charts that fit seamlessly into the dark glassmorphism styling of the CRM dashboard.
  2. NestJS routing resolves top-to-bottom. If `:campaignId` was registered first, calls to `dashboard` and `channels` would be matched as campaign IDs, leading to 404 or validation exceptions.
- **Impact on other docs:** None.

### [Stage 5-pre] Decision: Switch LLM provider — OpenAI GPT-4o → Google Gemini 2.0 Flash

- **What changed:** All LLM calls across every agent (`DataCleaningAgent`, `CustomerIntelligenceAgent`, `SegmentationAgent`, `CampaignAgent`, `TrendAgent`, `AnalyticsAgent`) now use `ChatGoogleGenerativeAI` from `@langchain/google-genai` instead of `ChatOpenAI` from `@langchain/openai`.
- **Why:** User does not have an OpenAI API key. Gemini 2.0 Flash is available on the free tier (1,500 requests/day via Google AI Studio) and is fully supported by LangGraph.js through `@langchain/google-genai`. The interface is identical — `ChatGoogleGenerativeAI` implements the same `BaseChatModel` contract, so no agent logic changes, only the instantiation line.
- **New env var:** `GEMINI_API_KEY` (obtained from https://aistudio.google.com — no credit card required). `OPENAI_API_KEY` removed.
- **New npm package:** `@langchain/google-genai` replaces `@langchain/openai` in `apps/backend/package.json`.
- **Model string:** `gemini-2.0-flash` (not `gemini-pro`, not `gemini-1.5-flash`).
- **Free tier limit:** 1,500 requests/day, 15 RPM. Sufficient for development and demo. Not suitable for production at scale without billing enabled.
- **Impact on other docs:** Arch.md §2, §5.4, §9 | deployment.md §3.2, §4.2 | readme.md tech stack + env table | AGENT_PROMPT.md tech stack section.
- **No impact on:** security.md FilterAST logic, BullMQ queues, DB schema, frontend code, simulator.

---

### [Stage 5-pre] Decision: FilterAST canonical schema locked — `"op"` key, no `tags` field, NestJS route order

- **What changed (op key):** The FilterAST condition key is `"op"`, not `"operator"`. The Stage 5 implementation plan proposed `"operator"` which would have silently broken the `SegmentExecutor` whitelist check (`SAFE_OPERATORS[node.op]` returns `undefined` if key is `"operator"`). The Gemini prompt for `SegmentationAgent` must explicitly instruct the model to use `"op"`.
- **What changed (tags):** `tags` removed from FilterAST field whitelist. The `customers` table has no `tags` column. Customer labels (champion/at-risk/etc.) are derived at query time from `engagement_score` thresholds — they do not exist as a stored column. Adding a `tags` filter would require a new DB migration first. Deferred post-Stage 5.
- **What changed (route order):** `POST /segments/ai-generate` must appear before `GET /segments/:id` in the NestJS controller. NestJS resolves routes in declaration order; `:id` would match the literal string `"ai-generate"` and return a 404 or UUID parse error.
- **Impact on other docs:** Arch.md §5.5 (new canonical schema section added) | security.md §3 (column whitelist updated with real field names).

---

### [Stage 6] Decision: Direct Gemini SDK for Campaign Proposal Generation

- **What changed:** Initialized GoogleGenerativeAI from `@google/generative-ai` in `CampaignAgentService` directly, mirroring the successful pattern established in `SegmentationAgentService`.
- **Why:** Avoids importing heavyweight LangGraph/LangChain wrappers when simple direct generation of a structured campaign suggestion proposal fits perfectly in a single call. This keeps bundle sizes small, compilation quick, and agent logic easily auditable.
- **Impact on other docs:** None.

---

### [Stage 7] Decision: Configurable Speed Up in Simulator & Status Preferences

- **What changed:** Introduced `SIMULATOR_DELAY_SCALE` environment variable to scale simulator delay timeouts, and created a numeric `STATUS_PREFERENCE` preference scoring check inside `CallbackWorker` when updating communication status.
- **Why:** Delays of 30-60 seconds specified in the PRD make manual QA checking extremely slow. Allowing speed up scale factor lets manual verification run instantly. Out-of-order delivery callback protection prevents late delivery messages from overwriting active click or conversion statuses in DB.
- **Impact on other docs:** None.

---

### [Stage 10] Decision: Production Deployment Configuration

- **What changed:**
  1. `data-source.ts` and `app.module.ts` now prefer `DATABASE_URL` (Neon connection string with SSL) when set, fallback to individual `DB_HOST`/`DB_PORT` vars for local Docker.
  2. BullMQ config now parses `REDIS_URL` (Upstash `rediss://` with TLS) when set, fallback to `REDIS_HOST`/`REDIS_PORT` for local Redis.
  3. Sentry integrated via `@sentry/nestjs`: `instrument.ts` loaded before all imports in `main.ts`, `SentryModule.forRoot()` in `app.module.ts`, `SentryGlobalFilter` as global exception filter.
  4. Backend `main.ts` binds to `0.0.0.0` (required by Railway for external access).
  5. Dockerfiles created for both backend (multi-stage) and simulator (single-stage).
  6. `railway.toml` config added for both services with health check path.
  7. All `.env.example` files updated with production env var placeholders.
  8. `next.config.ts` updated to use dynamic `NEXT_PUBLIC_API_URL` for rewrites.
  9. CI/CD skipped per user request.
- **Why:** Prepare codebase for deployment to Vercel (frontend) + Railway (backend + simulator) + Neon (PG) + Upstash (Redis).
- **Impact on other docs:** deployment.md (all configurations match).