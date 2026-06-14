# DEPLOY.md — Internal Deploy Runbook (us only)

> Step-by-step to take this from a clean machine to a live URL.
> Public/architecture-facing version: [`DEPLOYMENT.md`](DEPLOYMENT.md).
> **Repo layout gotcha:** git root is `Project-Dream_Underground/`, but the npm workspace
> root is the **`customer360/`** subfolder. Every platform's "root directory" must point at
> `customer360/...`, not the repo root.

---

## 0. What we're deploying

| # | Service | Platform | Root directory (on platform) |
|---|---------|----------|------------------------------|
| 1 | Postgres | Neon | — (managed) |
| 2 | Redis | Upstash | — (managed) |
| 3 | Backend (NestJS) | Railway service | `customer360/apps/backend` |
| 4 | Simulator (Fastify) | Railway service | `customer360/apps/channel-simulator` |
| 5 | Frontend (Next.js) | Vercel | `customer360/apps/frontend` |

Deploy order matters: **1 → 2 → 3 → 4 → 5**, then go back and fill cross-URLs (§6).

---

## 1. Provision data services

### Neon (Postgres)
1. neon.tech → new project `customer360`.
2. Copy the **pooled** connection string. Make sure it ends with `?sslmode=require`.
3. Save as `DATABASE_URL`.

### Upstash (Redis)
1. upstash.com → create Redis DB (region close to Railway).
2. Copy the `rediss://...` URL (TLS). Save as `REDIS_URL`.
   - BullMQ needs `maxRetriesPerRequest: null` — already set in code, nothing to configure.

### Gemini key
- aistudio.google.com → create API key → save as `GEMINI_API_KEY`. (Free tier: 15 RPM / 1500/day.)

### Generate secrets
```bash
openssl rand -hex 32     # → JWT_SECRET
openssl rand -hex 32     # → SIMULATOR_SECRET   (use the SAME value on backend + simulator)
```

---

## 2. Backend service (Railway)

1. railway.app → New Project → Deploy from GitHub repo `shaluidea11/Project-Dream_Underground`.
2. In the service **Settings → Source**, set **Root Directory** = `customer360/apps/backend`.
   - Railway reads `customer360/apps/backend/railway.toml`: build `npm run build`, start `node dist/main.js`, healthcheck `/health`.
   - ⚠️ npm-workspace install: Railway runs `npm install` from the root directory. If the build
     fails resolving workspace deps, set Root Directory = `customer360` and add a custom
     start command `node apps/backend/dist/main.js` instead. Try the per-app root first.
3. **Variables** (Settings → Variables):
   ```
   NODE_ENV=production
   DATABASE_URL=<neon>
   REDIS_URL=<upstash>
   JWT_SECRET=<generated>
   JWT_EXPIRY=1d
   GEMINI_API_KEY=<gemini>
   SIMULATOR_SECRET=<generated>
   FRONTEND_URL=https://PLACEHOLDER         # fill after Vercel (§6)
   SIMULATOR_URL=https://PLACEHOLDER        # fill after simulator (§6)
   # SENTRY_DSN=  (optional)
   ```
4. Deploy. Wait for healthcheck green. Note the public URL → this is **BACKEND_URL**.

---

## 3. Simulator service (Railway)

1. In the **same** Railway project → New Service → same GitHub repo.
2. **Root Directory** = `customer360/apps/channel-simulator` (uses its own `railway.toml`, start `node dist/server.js`).
3. **Variables**:
   ```
   NODE_ENV=production
   SIMULATOR_SECRET=<same value as backend>
   CRM_CALLBACK_URL=<BACKEND_URL>/api/callbacks/delivery
   SIMULATOR_DELAY_SCALE=1.0      # set 0.05 right before recording the demo
   ```
4. Deploy. Note the public URL → this is **SIMULATOR_URL**.

---

## 4. Migrations (automatic)

Migrations run **automatically on every deploy**. The backend start command is
`npm run start:prod`, which runs `migration:run:prod` (compiled, no `ts-node`) and then
`node dist/main.js`. On a fresh Neon DB the first deploy creates the full schema before the
server accepts traffic — nothing manual required.

If you ever need to run them by hand against Neon from your laptop:
```bash
cd customer360/apps/backend && npm run build
DATABASE_URL="<neon url>" NODE_ENV=production npm run migration:run:prod
```

**Verify:** hit `https://<BACKEND_URL>/health` → expect `{"status":"ok","services":{"database":"ok","redis":"ok"}}`.
On first boot with an empty DB, the backend auto-seeds demo data + admin user (check logs for `🌱`).

---

## 5. Frontend service (Vercel)

1. vercel.com → New Project → import the GitHub repo.
2. **Root Directory** = `customer360/apps/frontend` (Vercel auto-detects Next.js).
3. **Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=<BACKEND_URL>
   ```
   (`next.config.ts` rewrites `/api/*` and `/health` to this — the browser only ever hits Vercel.)
4. Deploy. Note the public URL → this is **FRONTEND_URL**.

---

## 6. Wire the cross-URLs (the step everyone forgets)

Now that all three URLs exist, fill the placeholders and redeploy the affected services:

| Set this var | On | To |
|---|---|---|
| `FRONTEND_URL` | Backend (Railway) | `<FRONTEND_URL>` (fixes CORS) |
| `SIMULATOR_URL` | Backend (Railway) | `<SIMULATOR_URL>` (outbound sends) |
| `CRM_CALLBACK_URL` | Simulator (Railway) | `<BACKEND_URL>/api/callbacks/delivery` |
| `NEXT_PUBLIC_API_URL` | Frontend (Vercel) | `<BACKEND_URL>` |

Redeploy backend + simulator after changing their vars. Redeploy frontend if you changed its var.

---

## 7. Smoke test (do this before recording)

```bash
# 1. Backend health
curl https://<BACKEND_URL>/health
# 2. Simulator health
curl https://<SIMULATOR_URL>/health
# 3. Callback auth works (wrong secret → 401)
curl -X POST https://<BACKEND_URL>/api/callbacks/delivery \
  -H 'Content-Type: application/json' -H 'X-Simulator-Secret: wrong' \
  -d '{"campaignId":"x","communicationId":"x","status":"delivered","timestamp":"2026-06-15T00:00:00Z"}'
# expect 401 Invalid simulator secret
```

Then in the browser:
1. Open `<FRONTEND_URL>`, log in with the seeded admin (check backend logs / `seed-admin.ts` for creds).
2. Customers list loads (auto-seed worked).
3. Create a segment via natural language → preview count returns (Gemini works).
4. Launch a small campaign → open its analytics page → funnel fills within seconds
   (set `SIMULATOR_DELAY_SCALE=0.05` on the simulator first, then redeploy).

---

## 8. Demo-day prep

- [ ] `SIMULATOR_DELAY_SCALE=0.05` on the simulator so the funnel animates live.
- [ ] Pre-run one AI segmentation a few minutes early to dodge Gemini cold-start / 429.
- [ ] Have `<BACKEND_URL>/health` and `<SIMULATOR_URL>/health` tabs open to show both services live.
- [ ] Keep a recorded fallback clip of the funnel filling, in case of a live 429.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Frontend loads, every API call fails | `NEXT_PUBLIC_API_URL` wrong / CORS | Check it equals `<BACKEND_URL>`; check backend `FRONTEND_URL` |
| Login works, data empty | migration step failed on deploy | Check backend deploy logs for migration errors; verify `DATABASE_URL` + `/health` database = ok |
| Campaign sends, funnel never moves | callbacks 401 / wrong URL | `SIMULATOR_SECRET` must match both sides; `CRM_CALLBACK_URL` must end `/api/callbacks/delivery` |
| Backend boots then crashes | bad `DATABASE_URL`/`REDIS_URL` | Neon needs `sslmode=require`; Upstash must be `rediss://` |
| AI segmentation 503 | `GEMINI_API_KEY` unset/placeholder | Set a real key (not `your-gemini-api-key`) |
| AI segmentation 429 | Gemini free-tier rate limit | Wait ~60s; pre-warm before demo |
| Railway build fails on workspace deps | per-app root can't resolve workspaces | Set Root Directory = `customer360`, custom start `node apps/backend/dist/main.js` |
