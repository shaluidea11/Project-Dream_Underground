# Arch.md — Customer360 AI CRM
> **Dream Underground CRM** | Architecture Reference Document  
> Version: 1.0 | Status: Approved for Stage 0

---

## 1. System Overview

Customer360 is an AI-native shopper marketing CRM. It is a **two-service system**:

1. **Main Platform** — Next.js 15 frontend + NestJS backend + PostgreSQL + Redis + BullMQ
2. **Channel Simulator** — Standalone Fastify microservice that simulates WhatsApp/SMS/Email/RCS delivery and fires async callbacks back into the main platform

These two services communicate **only** via:
- HTTP POST (CRM → Simulator): send request
- HTTP POST (Simulator → CRM): delivery callback

They share **no database, no Redis, no internal code**.

---

## 2. High-Level Architecture

```mermaid
graph TB
    subgraph Browser
        UI[Next.js 15 Frontend]
    end

    subgraph Main Platform [Main Platform — Railway]
        API[NestJS REST API]
        AGENTS[LangGraph.js Agent Layer]
        QUEUE[BullMQ Workers]
        CACHE[Upstash Redis]
        DB[(Neon PostgreSQL)]
    end

    subgraph Channel Simulator [Channel Simulator — Railway]
        SIM[Fastify Simulator Service]
        SIMQ[In-memory queue]
    end

    subgraph Storage
        S3[UploadThing / S3]
    end

    subgraph AI
        GPT[Google Gemini 2.0 Flash]
    end

    UI -->|HTTPS REST + JWT cookie| API
    API -->|TypeORM| DB
    API -->|ioredis| CACHE
    API -->|BullMQ enqueue| QUEUE
    QUEUE -->|process jobs| API
    API -->|HTTP POST /send| SIM
    SIM -->|async HTTP POST /callbacks/delivery| API
    API <-->|tool calls| AGENTS
    AGENTS -->|LLM calls| GPT[Google Gemini 2.0 Flash]
    API -->|file upload| S3
```

---

## 3. Detailed Component Architecture

### 3.1 Frontend (Next.js 15)

```
apps/frontend/
├── app/
│   ├── (auth)/           # login, register pages
│   ├── (dashboard)/
│   │   ├── customers/    # Customer 360 views
│   │   ├── segments/     # Audience segmentation
│   │   ├── campaigns/    # Campaign builder + AI generator
│   │   ├── analytics/    # Dashboard + charts
│   │   └── upload/       # Excel/CSV upload
│   └── layout.tsx
├── components/
│   ├── ui/               # ShadCN components
│   ├── charts/           # Recharts wrappers
│   └── agents/           # AI chat interface components
└── lib/
    ├── api.ts            # Typed API client
    └── hooks/            # React Query hooks
```

**Key frontend decisions:**
- All data fetching via React Query (tanstack/query)
- JWT stored in HTTP-only cookie, never localStorage
- File upload uses UploadThing client SDK
- Charts: Recharts for all analytics views

### 3.2 Backend — NestJS

```
apps/backend/
├── src/
│   ├── auth/             # JWT, guards, RBAC decorators
│   ├── customers/        # Customer CRUD + 360 profile
│   ├── orders/           # Order ingestion
│   ├── upload/           # File parsing, schema detection
│   ├── segments/         # Audience segmentation engine
│   ├── campaigns/        # Campaign builder + scheduler
│   ├── callbacks/        # Receives delivery events from Simulator
│   ├── analytics/        # Metrics aggregation
│   ├── agents/           # LangGraph.js agent orchestration
│   ├── queue/            # BullMQ producers + consumers
│   └── common/           # Guards, interceptors, filters
```

### 3.3 Channel Simulator (Fastify)

```
apps/channel-simulator/
├── src/
│   ├── server.ts         # Fastify app entry
│   ├── routes/
│   │   └── send.ts       # POST /send — accepts send requests
│   ├── simulator/
│   │   └── engine.ts     # Probability engine for outcomes
│   └── callback/
│       └── dispatcher.ts # Fires callbacks to CRM
```

The simulator is a **deliberately thin** service. It:
1. Accepts a `POST /send` with `{ recipient, channel, message, campaignId, communicationId }`
2. Queues the item in memory
3. After a randomized delay (2–15s), fires a callback to the CRM at `POST /callbacks/delivery`
4. Fires follow-up events (open, click, convert) staggered over time

**Outcome probability table (configurable per channel):**

| Event | WhatsApp | SMS | Email | RCS |
|---|---|---|---|---|
| Delivered | 92% | 88% | 85% | 90% |
| Failed | 8% | 12% | 15% | 10% |
| Opened | 70% of delivered | 60% | 35% | 65% |
| Clicked | 25% of opened | 15% | 20% | 22% |
| Converted | 8% of clicked | 5% | 6% | 7% |

---

## 4. Database Schema (ERD)

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        enum role "admin|marketing_manager|analyst"
        timestamp created_at
        timestamp updated_at
    }

    customers {
        uuid id PK
        string canonical_name
        string email UK
        string phone UK
        string city
        string state
        string preferred_channel
        float engagement_score
        float lifetime_value
        float total_spend
        int order_count
        timestamp last_order_at
        jsonb raw_identities "array of original records before dedup"
        timestamp created_at
        timestamp updated_at
    }

    orders {
        uuid id PK
        uuid customer_id FK
        string external_order_id UK
        float amount
        string status
        jsonb items
        timestamp ordered_at
        timestamp created_at
    }

    customer_identity_map {
        uuid id PK
        uuid canonical_customer_id FK
        string source_name
        string source_email
        string source_phone
        string source_file
        float match_confidence
        timestamp created_at
    }

    segments {
        uuid id PK
        uuid created_by FK
        string name
        text description
        jsonb filter_definition "structured filter AST"
        string nl_query "original NL input if AI-generated"
        int customer_count
        timestamp last_computed_at
        timestamp created_at
    }

    segment_memberships {
        uuid segment_id FK
        uuid customer_id FK
        timestamp added_at
    }

    campaigns {
        uuid id PK
        uuid created_by FK
        uuid segment_id FK
        string name
        enum channel "whatsapp|sms|email|rcs"
        text message_body
        string subject
        string cta_text
        string cta_url
        enum status "draft|scheduled|running|completed|paused"
        timestamp scheduled_at
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }

    communications {
        uuid id PK
        uuid campaign_id FK
        uuid customer_id FK
        string recipient_phone
        string recipient_email
        enum channel "whatsapp|sms|email|rcs"
        text message_body
        enum status "pending|sent|delivered|failed|opened|read|clicked|converted"
        timestamp sent_at
        timestamp delivered_at
        timestamp opened_at
        timestamp clicked_at
        timestamp converted_at
        timestamp created_at
    }

    campaign_analytics {
        uuid id PK
        uuid campaign_id FK
        int total_sent
        int total_delivered
        int total_failed
        int total_opened
        int total_read
        int total_clicked
        int total_converted
        timestamp computed_at
    }

    upload_jobs {
        uuid id PK
        uuid created_by FK
        string file_name
        string file_url
        enum type "customers|orders"
        enum status "pending|processing|completed|failed"
        jsonb schema_map "AI detected column mapping"
        int records_processed
        int duplicates_merged
        text error_message
        timestamp created_at
        timestamp completed_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        string action
        string resource_type
        uuid resource_id
        jsonb metadata
        string ip_address
        timestamp created_at
    }

    users ||--o{ segments : creates
    users ||--o{ campaigns : creates
    users ||--o{ upload_jobs : triggers
    users ||--o{ audit_logs : generates
    customers ||--o{ orders : has
    customers ||--o{ customer_identity_map : has
    customers ||--o{ segment_memberships : in
    customers ||--o{ communications : receives
    segments ||--o{ segment_memberships : contains
    segments ||--o{ campaigns : targets
    campaigns ||--o{ communications : sends
    campaigns ||--|| campaign_analytics : tracked_by
```

---

## 5. Multi-Agent Architecture (LangGraph.js)

### 5.1 Agent Inventory

| Agent | Trigger | Responsibility |
|---|---|---|
| DataCleaningAgent | File upload | Detect schema, map columns, normalize phone/email, deduplicate |
| CustomerIntelligenceAgent | Post-dedup | Score engagement, compute CLV, detect preferred channel |
| SegmentationAgent | NL query from user | Parse NL → filter AST → execute → return segment |
| CampaignAgent | User prompt "bring back inactive users" | Suggest audience + message + channel + CTA |
| TrendAgent | Daily cron (midnight) | Scan industry signals, generate trend insights |
| AnalyticsAgent | Post-campaign completion | Summarize performance, suggest improvements |

### 5.2 Shared State Schema

```typescript
interface CRMAgentState {
  // Input context
  userId: string;
  tenantId: string;
  task: 'clean' | 'profile' | 'segment' | 'campaign' | 'trend' | 'analytics';

  // Data cleaning
  rawFileUrl?: string;
  detectedSchema?: Record<string, string>;
  cleanedRecords?: CustomerRecord[];
  duplicateGroups?: DuplicateGroup[];

  // Segmentation
  nlQuery?: string;
  filterAST?: FilterNode;
  segmentResult?: { customerIds: string[]; count: number };

  // Campaign generation
  campaignGoal?: string;
  suggestedSegment?: SegmentSuggestion;
  generatedMessage?: GeneratedMessage;

  // Analytics
  campaignId?: string;
  analyticsReport?: AnalyticsReport;

  // Orchestration
  currentAgent: string;
  errors: string[];
  messages: BaseMessage[];
}
```

### 5.3 Agent Workflow Graph

```mermaid
graph TD
    START([Start]) --> ROUTER{Task Router}

    ROUTER -->|upload| DCA[DataCleaningAgent]
    ROUTER -->|profile| CIA[CustomerIntelligenceAgent]
    ROUTER -->|segment NL| SA[SegmentationAgent]
    ROUTER -->|campaign goal| CA[CampaignAgent]
    ROUTER -->|trend scan| TA[TrendAgent]
    ROUTER -->|analytics| AA[AnalyticsAgent]

    DCA -->|cleaned records| CIA
    CIA -->|profiles updated| END1([Done: Ingestion Complete])

    SA -->|filter AST built| SA_EXEC[Execute Filter SQL]
    SA_EXEC -->|segment saved| END2([Done: Segment Ready])

    CA -->|audience suggested| CA_MSG[Generate Message]
    CA_MSG -->|message drafted| CA_CH[Recommend Channel]
    CA_CH -->|campaign draft| END3([Done: Campaign Draft])

    TA --> END4([Done: Trends Saved])
    AA --> END5([Done: Report Generated])
```

### 5.5 FilterAST Canonical Schema

This is the **single source of truth** for the FilterAST structure used everywhere: agent output, DB storage (`segments.filter_definition`), and the `SegmentExecutor`.

```typescript
// The only valid FilterAST shape — agents MUST output this exactly
interface FilterAST {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

interface FilterCondition {
  field: string;    // must be in COLUMN_WHITELIST
  op: string;       // must be in SAFE_OPERATORS — key is "op", NOT "operator"
  value: string | number;
}
```

**Example (correct):**
```json
{
  "logic": "AND",
  "conditions": [
    { "field": "totalSpend", "op": "gt", "value": 500 },
    { "field": "city", "op": "eq", "value": "Mumbai" }
  ]
}
```

**Approved field whitelist (`COLUMN_WHITELIST`) — Stage 5:**

| AST `field` | DB column | Type |
|---|---|---|
| `totalSpend` | `c.total_spend` | float |
| `orderCount` | `c.order_count` | int |
| `engagementScore` | `c.engagement_score` | float |
| `city` | `c.city` | string |
| `state` | `c.state` | string |
| `lastOrderAt` | `c.last_order_at` | date (ISO string) |
| `preferredChannel` | `c.preferred_channel` | string |

> **`tags` is NOT in the whitelist.** The `customers` table has no `tags` column. Customer labels (champion/at-risk) are derived at display time from `engagement_score` thresholds. A `tags` column and filter support is deferred to a future migration.

**Approved operator whitelist (`SAFE_OPERATORS`):**

| AST `op` | SQL operator |
|---|---|
| `gt` | `>` |
| `lt` | `<` |
| `gte` | `>=` |
| `lte` | `<=` |
| `eq` | `=` |
| `neq` | `!=` |

Any `field` or `op` not in these whitelists → `BadRequestException` immediately. Never pass through to query builder.

**Route declaration order (NestJS controller):**
`POST /segments/ai-generate` MUST be declared **before** `GET /segments/:id` in the controller to prevent NestJS from matching the string `"ai-generate"` as an `:id` param.



Each agent is a LangGraph.js node:

```typescript
// Example: SegmentationAgent
const segmentationNode = async (state: CRMAgentState) => {
  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash' });
  const tools = [buildFilterASTTool, executeSegmentTool];
  const agent = createReactAgent({ llm, tools });
  const result = await agent.invoke({
    messages: [new HumanMessage(`Convert this to a customer filter: ${state.nlQuery}`)]
  });
  return { ...state, filterAST: extractFilterAST(result), currentAgent: 'segmentation' };
};
```

---

## 6. Queue Architecture (BullMQ)

### 6.1 Queue Inventory

| Queue | Producer | Consumer | Concurrency |
|---|---|---|---|
| `upload.process` | Upload controller | UploadWorker | 2 |
| `campaign.send` | Campaign scheduler | CampaignSendWorker | 10 |
| `callback.process` | Callback controller | CallbackWorker | 20 |
| `analytics.compute` | Campaign completion hook | AnalyticsWorker | 5 |
| `trend.scan` | Daily cron job | TrendWorker | 1 |
| `segment.compute` | Segment save | SegmentWorker | 5 |

### 6.2 Queue Flow Diagram

```mermaid
sequenceDiagram
    participant API
    participant Redis
    participant CampaignWorker
    participant Simulator
    participant CallbackWorker
    participant DB

    API->>Redis: enqueue campaign.send job
    Redis->>CampaignWorker: dequeue (concurrency: 10)
    CampaignWorker->>DB: load segment members (batch 100)
    loop For each batch
        CampaignWorker->>Simulator: POST /send {recipient, channel, message}
        CampaignWorker->>DB: insert communication (status=sent)
    end
    Simulator-->>API: POST /callbacks/delivery {communicationId, event}
    API->>Redis: enqueue callback.process job
    Redis->>CallbackWorker: dequeue
    CallbackWorker->>DB: UPDATE communication SET status=delivered/opened/...
    CallbackWorker->>DB: UPDATE campaign_analytics (increment counter)
```

### 6.3 Retry Strategy

```typescript
// BullMQ job options
const jobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,  // 2s, 4s, 8s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};
```

---

## 7. Campaign Send Sequence

```mermaid
sequenceDiagram
    actor Marketer
    participant Frontend
    participant CampaignAPI
    participant BullMQ
    participant Worker
    participant ChannelSimulator
    participant CallbackAPI
    participant DB

    Marketer->>Frontend: Click "Launch Campaign"
    Frontend->>CampaignAPI: POST /campaigns/:id/launch
    CampaignAPI->>DB: SET campaign.status = running
    CampaignAPI->>BullMQ: enqueue campaign.send job
    CampaignAPI-->>Frontend: 202 Accepted

    BullMQ->>Worker: dequeue job
    Worker->>DB: SELECT customers in segment (paginated)
    loop Batch of 100 customers
        Worker->>ChannelSimulator: POST /send
        Worker->>DB: INSERT communication (status=sent)
    end

    Note over ChannelSimulator: Async delay 2–15s per message
    ChannelSimulator->>CallbackAPI: POST /callbacks/delivery (delivered)
    ChannelSimulator->>CallbackAPI: POST /callbacks/delivery (opened) [+30s]
    ChannelSimulator->>CallbackAPI: POST /callbacks/delivery (clicked) [+60s]

    CallbackAPI->>BullMQ: enqueue callback.process
    BullMQ->>Worker: process callback
    Worker->>DB: UPDATE communication status
    Worker->>DB: INCREMENT campaign_analytics counters

    Frontend->>CampaignAPI: GET /analytics/:campaignId (polling / SSE)
    CampaignAPI-->>Frontend: live metrics
```

---

## 8. Non-Functional Requirements

### 8.1 Scale Targets

| Metric | Target |
|---|---|
| Customers | 100,000 |
| Orders | 1,000,000 |
| Campaign sends/day | 10,000 |
| Concurrent users | 50 |
| API p95 latency | < 300ms |
| File upload processing | < 2 min for 50k rows |

### 8.2 Scaling Strategy

**Database:**
- PostgreSQL indexes on `customers.email`, `customers.phone`, `orders.customer_id`, `orders.ordered_at`, `communications.campaign_id`, `communications.status`
- Partial indexes for active segment queries
- `segment_memberships` computed async via BullMQ, not inline

**Queue:**
- `campaign.send` worker uses cursor-based pagination, batches of 100
- Never loads all customers in memory at once
- BullMQ rate limiter: max 500 jobs/minute for `campaign.send`

**Redis:**
- Segment count cached for 5 minutes
- Analytics counters cached for 30 seconds (avoids per-request DB aggregation)
- Campaign status SSE uses Redis pub/sub

### 8.3 Failure Handling

| Failure | Strategy |
|---|---|
| Simulator unreachable | Exponential backoff (3 attempts), mark communication `failed` |
| Callback duplicate | `ON CONFLICT DO NOTHING` on communication status update |
| Agent LLM timeout | Fallback to rule-based filter parser |
| DB connection lost | NestJS TypeORM auto-reconnect + health check endpoint |
| Upload file corrupt | Validate file header before enqueue, return 400 immediately |

### 8.4 Observability

- **Sentry**: Error tracking on both frontend and backend
- **PostHog**: Product analytics (page views, feature usage)
- **BullMQ Board**: Job queue monitoring at `/admin/queues` (auth-gated)
- **Structured logging**: NestJS Logger with correlation IDs per request
- **Health endpoint**: `GET /health` returns DB, Redis, Simulator connectivity status

---

## 9. Technology Decisions Summary

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) | SSR + RSC + fast DX |
| UI | ShadCN + TailwindCSS | Unstyled primitives, full control |
| Charts | Recharts | React-native, composable |
| Backend | NestJS | DI, decorators, guards, pipes — production patterns |
| ORM | TypeORM | Decorator-based, migrations, relations |
| Queue | BullMQ | Built on Redis, reliable, retries, concurrency control |
| AI Framework | LangGraph.js | Feature parity with Python, pure Node, no sidecar |
| LLM | Google Gemini 2.0 Flash | Free tier (1,500 req/day), function calling supported, drop-in via @langchain/google-genai |
| LangChain package | @langchain/google-genai | ChatGoogleGenerativeAI — same interface as ChatOpenAI |
| Simulator | Fastify | Thin, fast, no DI overhead for a stub service |
| Database | Neon PostgreSQL | Serverless PG, branching for dev/staging |
| Cache | Upstash Redis | Serverless Redis, BullMQ compatible |
| Auth | JWT + HTTP-only cookie | Stateless, XSS-resistant cookie |
| Storage | UploadThing | S3-compatible, free tier generous, built for Next.js |
| Monorepo | npm workspaces | Zero tooling overhead |