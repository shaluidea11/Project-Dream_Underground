# Prd.md — Customer360 AI CRM
> **Dream Underground CRM** | Product Requirements Document  
> Version: 1.0 | Status: Approved for Stage 0

---

## 1. Product Vision

Customer360 is a shopper marketing CRM that helps consumer brands decide **who to talk to**, **what to say**, and **how to reach them** — powered by AI at every step.

This is **not** a sales CRM (no deals, pipelines, or tickets). It is purely a marketing and engagement tool for brands with a shopper base and purchase history.

**Target users:** Marketing Managers at D2C or retail brands (fashion, F&B, beauty, grocery)

---

## 2. User Roles

| Role | Permissions |
|---|---|
| **Admin** | All permissions. Manage users, view audit logs, configure system settings |
| **Marketing Manager** | Upload data, create segments, build campaigns, launch campaigns, view analytics |
| **Analyst** | View-only: customers, segments, campaigns, analytics. Cannot launch campaigns |

---

## 3. Module Specifications

### Module 1 — Authentication

#### 1.1 Register
- Fields: name, email, password, role (admin-only field)
- Password: min 8 chars, 1 uppercase, 1 number
- On success: redirect to dashboard

#### 1.2 Login
- Fields: email, password
- On success: JWT issued in HTTP-only `access_token` cookie (7-day expiry)
- On failure: generic "Invalid credentials" (no enumeration)

#### 1.3 Logout
- Clears HTTP-only cookie
- Invalidates session server-side (Redis token blacklist)

#### 1.4 Session Management
- JWT payload: `{ sub: userId, email, role, iat, exp }`
- Token refresh: sliding window — re-issued on each request if <1 day remaining
- Protected routes: all `/api/*` except `/api/auth/login` and `/api/auth/register`

---

### Module 2 — Smart Excel Upload

#### 2.1 Supported File Types
- `.csv`, `.xlsx`, `.xls`
- Max file size: 50MB
- Max rows: 100,000 per upload

#### 2.2 Upload Types
- **Customer file**: contains identity fields (name, email, phone, city, etc.)
- **Order file**: contains transaction fields (order ID, amount, date, items, customer ref)

#### 2.3 AI-Powered Processing Pipeline

**Step 1 — Schema Detection**  
The DataCleaningAgent inspects the first 20 rows and maps columns to canonical fields:

| Raw column (examples) | Canonical field |
|---|---|
| "Mobile", "Phone No", "Contact" | `phone` |
| "Email ID", "Email Address", "Mail" | `email` |
| "Customer Name", "Full Name", "Name" | `name` |
| "Order Date", "Purchase Date", "Date" | `ordered_at` |
| "Amount", "Total", "Bill Amount" | `amount` |

**Step 2 — Normalization**
- Phone: strip all non-digits, add country prefix (default +91), normalize to E.164
- Email: lowercase, trim, validate format
- Name: title-case, remove special chars, trim whitespace

**Step 3 — Deduplication**
Three-pass matching:
1. Exact email match → same customer
2. Exact phone match → same customer  
3. Fuzzy name match (Levenshtein < 2) + same city → candidate group → AI decides

**Step 4 — Merge**
- Winning record: prefer most recent data
- All source identities stored in `customer_identity_map`
- `raw_identities` JSONB field retains all pre-merge data

#### 2.4 UI States
- Idle: drag-and-drop upload zone
- Uploading: progress bar
- Processing: "AI is analyzing your file..." with step indicator
- Review: show detected schema, allow manual correction before commit
- Complete: summary card (X records imported, Y duplicates merged)
- Error: detailed error message with downloadable error report

#### 2.5 Acceptance Criteria
- [ ] Upload a CSV with 1,000 customer rows → all rows parsed
- [ ] Phone numbers in multiple formats normalized to E.164
- [ ] "Arsh Prem", "Arsh P.", "Arsh Kumar Prem" resolved to one profile
- [ ] Duplicate count shown on completion screen
- [ ] Failed rows downloadable as error CSV

---

### Module 3 — Customer 360 Profile

#### 3.1 Profile Fields

| Field | Source | Computed? |
|---|---|---|
| Canonical name | Upload → AI merge | No |
| Email | Upload | No |
| Phone | Upload → normalized | No |
| City, State | Upload | No |
| Total spend | Aggregated from orders | Yes |
| Order count | COUNT(orders) | Yes |
| Last purchase date | MAX(orders.ordered_at) | Yes |
| Preferred channel | Engagement history | Yes (AI) |
| Engagement score | Campaign response rate | Yes (formula) |
| Customer Lifetime Value | Historical spend model | Yes (AI) |
| All orders | orders table join | No |

#### 3.2 Engagement Score Formula
```
engagement_score = (
  (opened_count / sent_count) * 0.3 +
  (clicked_count / sent_count) * 0.4 +
  (converted_count / sent_count) * 0.3
) * 100
```
Recomputed after every campaign completion.

#### 3.3 CLV Formula (simplified for v1)
```
CLV = avg_order_value * purchase_frequency * customer_lifespan_months
```
Where lifespan = months since first order.

#### 3.4 UI Requirements
- Customer list view: searchable, sortable by spend/engagement/recency
- Customer detail page: full 360 profile with order timeline
- Order list: paginated, 20 per page, shows product items
- Tags: low-value / mid-value / high-value / at-risk / champion (auto-assigned)

---

### Module 4 — Audience Segmentation

#### 4.1 Filter-Based Segmentation (Manual)

Available filters:
- Total spend: >, <, between
- Order count: >, <, =
- Last order date: before X days ago, after, between
- City: is, is not
- State: is, is not
- Engagement score: >, <
- Preferred channel: is
- Customer tag: is

Filters can be combined with AND / OR logic.

#### 4.2 AI Segmentation (Natural Language)

User types a query in plain language. The SegmentationAgent converts it to a filter AST and executes it.

**Examples:**

| NL Input | Generated Filter |
|---|---|
| "Customers who spent more than ₹5000 and haven't purchased in 60 days" | `spend > 5000 AND last_order < 60d ago` |
| "Premium shoppers in Mumbai who love WhatsApp" | `spend > 10000 AND city = Mumbai AND preferred_channel = whatsapp` |
| "Inactive customers who bought in December" | `last_order > 90d ago AND ordered_month = 12` |

#### 4.3 Segment Management
- Save segments with a name and description
- Segment size recomputed on save and on campaign launch
- Segments can be refreshed manually ("Recompute now")
- Segment membership stored in `segment_memberships` table

#### 4.4 Acceptance Criteria
- [ ] Create a manual segment with 3 filters → correct count shown
- [ ] Type NL query → segment created with correct customers
- [ ] Segment size updates when new customers are uploaded
- [ ] Cannot launch campaign with 0-member segment

---

### Module 5 — Campaign Builder

#### 5.1 Campaign Creation Fields

| Field | Required | Notes |
|---|---|---|
| Campaign name | Yes | |
| Target segment | Yes | Dropdown of saved segments |
| Channel | Yes | WhatsApp / SMS / Email / RCS |
| Message body | Yes | Rich text for email, plain for SMS/WhatsApp |
| Subject line | Email only | |
| CTA text | No | |
| CTA URL | No | Validated URL |
| Schedule | Yes | Send now or schedule for future |

#### 5.2 Message Personalization Variables
Available in all message bodies:
- `{{customer.name}}` → replaced with customer canonical name
- `{{customer.city}}` → replaced with city
- `{{order.last_amount}}` → last order value
- `{{order.last_date}}` → last order date formatted

#### 5.3 Campaign States

```
draft → scheduled → running → completed
                 ↘ paused → running (resume)
```

#### 5.4 Launch Flow
1. Validate: segment has members, message is not empty, channel selected
2. Confirm dialog: "You are about to send to N customers via WhatsApp"
3. On confirm: API enqueues `campaign.send` job, status → running
4. Real-time progress shown on campaign page (sent counter increments)

---

### Module 6 — AI Campaign Generator

#### 6.1 Input
User enters a freeform goal:
- "Bring back inactive premium customers"
- "Upsell coffee bundle to winter shoppers"
- "Re-engage customers who haven't shopped in 90 days"

#### 6.2 AI Output (CampaignAgent)

The CampaignAgent returns a structured suggestion:

```json
{
  "suggested_segment": {
    "description": "Customers who spent > ₹5000 and last ordered > 60 days ago",
    "filter_ast": { ... },
    "estimated_size": 847
  },
  "channel_recommendation": "whatsapp",
  "message": "Hey {{customer.name}}, we miss you! ☕ Your favourite coffee bundle is back — use WELCOME10 for 10% off.",
  "subject": "We miss you, {{customer.name}}!",
  "cta_text": "Shop Now",
  "cta_url": "https://brand.com/comeback",
  "reasoning": "WhatsApp has highest open rate for this segment. Bundle offer works for high-value lapsed customers."
}
```

#### 6.3 UI Flow
1. Open "Generate Campaign" drawer
2. Type goal in textarea
3. Click "Generate" → loading spinner
4. Review AI suggestion (all fields editable)
5. Click "Use This Campaign" → pre-fills Campaign Builder form
6. Optionally edit + launch

---

### Module 7 — Analytics Dashboard

#### 7.1 Campaign-Level Metrics

| Metric | Description |
|---|---|
| Sent | Total communications dispatched |
| Delivered | Confirmed receipt by simulator |
| Failed | Delivery failures |
| Opened | Message opened (WhatsApp read receipt / email open pixel) |
| Read | Distinct from opened for RCS |
| Clicked | CTA link clicked |
| Converted | Order placed post-click (tracked via callback) |

Derived:
- Delivery rate = Delivered / Sent
- Open rate = Opened / Delivered
- Click rate = Clicked / Opened
- Conversion rate = Converted / Clicked

#### 7.2 Charts Required

**Funnel chart** (per campaign):
```
Sent → Delivered → Opened → Clicked → Converted
```

**Time-series chart** (per campaign):
- X-axis: time since launch (hours)
- Y-axis: cumulative delivered/opened/clicked

**Channel comparison** (across campaigns):
- Bar chart comparing delivery/open/click rates per channel

#### 7.3 Dashboard Home Metrics
- Total customers
- Active segments
- Campaigns this month
- Best performing campaign (by conversion rate)

---

### Module 8 — Trend Intelligence

#### 8.1 Daily Scan (TrendAgent)
Runs at midnight via BullMQ cron. Generates insights like:

- "Customers who bought cold brew respond 2.3x better to bundle offers in July"
- "High-value segment hasn't been targeted in 14 days — campaign opportunity"
- "Open rates dropped 12% this week — consider changing message tone"

#### 8.2 Trend Display
- Notification bell in header shows unread trend insights
- Trend insights page lists all generated trends with timestamps
- Each insight has a "Create campaign from this insight" button

---

## 4. Out of Scope (v1)

The following are explicitly NOT in scope for this version:
- Real messaging provider integration (Twilio, MSG91, etc.)
- Mobile app
- Customer support ticketing
- Sales pipeline / deal management
- A/B testing campaigns
- Multi-tenancy / multiple brands
- Webhook integrations
- Revenue attribution beyond "converted" flag

---

## 5. Success Metrics

| Metric | Target |
|---|---|
| File upload → profiles visible | < 3 minutes for 10k rows |
| NL segment query → results | < 5 seconds |
| Campaign launch → first delivery callback | < 30 seconds |
| Dashboard data freshness | < 60 seconds after callback |
| System uptime | > 99% |
