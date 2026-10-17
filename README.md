# ReachInbox.ai — Email Outreach Job Scheduler

> **Live Hosted Demo**: [https://reachinbox-email-scheduler-git-main-mega131s-projects.vercel.app](https://reachinbox-email-scheduler-git-main-mega131s-projects.vercel.app)  
> **GitHub Repository**: [https://github.com/mega131/reachinbox-email-scheduler](https://github.com/mega131/reachinbox-email-scheduler)  

Production-grade full-stack email outreach scheduling engine built for high concurrency, persistent Redis-backed BullMQ job queues, strict zero-cron architecture, atomic distributed rate-limiting, Ethereal SMTP simulated delivery, Elasticsearch full-text search, and real Slack rate-limit alerting.

---

## 📑 Table of Contents

1. [How to Run Backend (Express, Redis, DB, BullMQ Worker)](#1-how-to-run-backend-express-redis-db-bullmq-worker)
2. [How to Run Frontend (React + Vite)](#2-how-to-run-frontend-react-18--vite)
3. [How to Set Up Ethereal Email & Environment Variables](#3-how-to-set-up-ethereal-email--environment-variables)
4. [Architecture Overview](#4-architecture-overview)
   - [How Scheduling Works (Strictly Zero-Cron)](#a-how-scheduling-works-strictly-zero-cron)
   - [How Persistence on Restart is Handled (Transactional Outbox)](#b-how-persistence-on-restart-is-handled-transactional-outbox)
   - [How Rate Limiting & Concurrency are Implemented](#c-how-rate-limiting--concurrency-are-implemented)
5. [List of Features Implemented (Backend & Frontend Mapping)](#5-list-of-features-implemented-matrix)
6. [5-Minute Demo Video Walkthrough Guide & Script](#6-5-minute-demo-video-walkthrough-guide--script)
   - [Creating Scheduled Emails](#step-1-create-scheduled-emails)
   - [Inspecting Scheduled & Sent Tables + Ethereal Preview](#step-2-dashboard-scheduled--sent-tables)
   - [Server Restart Scenario (Crash Resilience Demo)](#step-3-server-restart-resilience-demo)
   - [Rate Limiting & Delay Behavior Under Load](#step-4-bonus-rate-limiting--delay-under-load)
7. [API Endpoints Reference](#7-api-endpoints-reference)

---

## 1. How to Run Backend (Express, Redis, DB, BullMQ Worker)

### Prerequisites
- **Node.js**: `>= 18.0.0` (v20 or v22 recommended)
- **PostgreSQL**: Port `5432`
- **Redis**: Port `6379`

---

### Option A: One-Click Startup (Windows PowerShell / Batch — Recommended)
If you are on Windows, you can start the entire stack (Redis, Backend API, BullMQ Worker, and Frontend) with a single command:

```powershell
# In project root:
.\start.ps1
```
*(Or double-click `start.bat` in File Explorer)*

This script automatically:
1. Copies `.env.example` to `.env` if not present.
2. Starts the pre-bundled local Windows Redis binary (`tools/redis/redis-server.exe`) on port `6379`.
3. Pushes the Prisma schema to PostgreSQL.
4. Concurrently starts the Express API (`:4000`), BullMQ Worker, and Vite Frontend (`:5173`) in one unified terminal with color-coded logs.

---

### Option B: Docker Compose (PostgreSQL, Redis, Elasticsearch)
If you prefer Docker for backing services:

```bash
# 1. Start PostgreSQL, Redis, and Elasticsearch
docker compose up -d

# 2. Install monorepo dependencies
npm install

# 3. Build shared TypeScript package
npm run build --workspace=@reachinbox/shared

# 4. Push Prisma database schema
npm run db:push
```

---

### Option C: Manual Terminal Execution (Step-by-Step)

#### Step 1: Start Redis
- **macOS / Linux**: `redis-server --port 6379`
- **Windows**: `& ".\tools\redis\redis-server.exe" --port 6379 --bind 127.0.0.1`

#### Step 2: Initialize Database
```bash
npm install
npm run build --workspace=@reachinbox/shared
npm run db:push
```

#### Step 3: Run the Express REST API Server
```bash
npm run dev:api
```
- API Server listens on: **`http://localhost:4000`**
- Health Check: **`http://localhost:4000/api/health`**
- Bull Board Queue Telemetry: **`http://localhost:4000/admin/queues`**

#### Step 4: Run the BullMQ Worker Process (Separate Process)
In a new terminal:
```bash
npm run dev:worker
```
- Listens to the `email-dispatch-queue` in Redis.
- Concurrency: `5` workers.
- Enforces distributed rate limiting & inter-send delay via Redis Lua scripts.
- Delivers emails to Ethereal SMTP and records live preview URLs.

---

## 2. How to Run Frontend (React 18 + Vite)

In a separate terminal:
```bash
npm run dev:web
```
- The Vite development server runs at: **`http://localhost:5173`**
- Proxies `/api` requests directly to backend port `4000`.

### Production Build & Preview
```bash
# Build the production bundle
npm run build --workspace=reachinbox-web

# Preview the built static assets
npm run preview --workspace=reachinbox-web
```

---

## 3. How to Set Up Ethereal Email & Environment Variables

### How Ethereal Email Works
Per assignment specifications, outreach delivery is simulated using **Ethereal Email** (Nodemailer's official sandbox service). This avoids sending spam to real email accounts and generates live clickable preview URLs (`https://ethereal.email/messages` or message URLs) to verify HTML rendering.

**Zero Setup Required**:
The worker automatically calls `nodemailer.createTestAccount()` on demand and caches the generated credentials in memory. You do **not** need to manually register an account.

*(Optional)* If you wish to use your own specific Ethereal mailbox:
1. Visit [ethereal.email/create](https://ethereal.email/create) to generate credentials.
2. Add them to your `.env`:
   ```env
   ETHEREAL_USER="your-user@ethereal.email"
   ETHEREAL_PASS="your-ethereal-password"
   ```

---

### Complete Environment Variables Reference (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:1234@localhost:5432/reachinbox_db?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | API Server port | `4000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `SESSION_SECRET` | Cookie signing secret (>= 32 chars) | `reachinbox_session_secret_key_prod_32chars_min` |
| `ENCRYPTION_SECRET` | AES-256 key for Slack tokens (32 chars) | `0123456789abcdef0123456789abcdef` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (Optional for dev) | `your-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret (Optional for dev) | `GOCSPX-your-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth Redirect URI | `http://localhost:4000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | `your-slack-client-id` |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | `your-slack-client-secret` |
| `SLACK_REDIRECT_URI` | Slack OAuth Redirect URL | `http://localhost:4000/api/slack/callback` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint (Optional) | `http://localhost:9200` |
| `DEFAULT_MIN_DELAY_MS` | Minimum inter-send delay (ms) | `2000` |
| `MAX_EMAILS_PER_HOUR` | Hourly quota per sender | `200` |
| `WORKER_CONCURRENCY` | BullMQ Worker concurrency | `5` |

---

## 4. Architecture Overview

```
                     ┌───────────────────────────────────────────┐
                     │           React 18 + Vite Web App         │
                     │          (Port 5173 - Dark Theme)         │
                     └─────────────────────┬─────────────────────┘
                                           │ HTTP / Cookies
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Express.js API Server (Port 4000)                               │
├───────────────────────────────┬─────────────────────────────────┬───────────────────────────────┤
│        Auth & Sessions        │      Campaign & Outbox Engine   │       Protected Bull Board    │
│  - Google OAuth 2.0 / OIDC    │  - CSV / TXT Safe Parser        │  - /admin/queues              │
│  - 1-Click Google Chooser     │  - Transactional Outbox Pattern │  - Queue Telemetry & Metrics  │
│  - Slack OAuth & Webhooks     │  - Idempotency Key Enforcement  │  - Active, Delayed, Waiting   │
└──────────────┬────────────────┴────────────────┬────────────────┴───────────────┬───────────────┘
               │                                 │                                │
               │ Reads / Writes                  │ Atomic Outbox Commit           │ Publishes Jobs
               ▼                                 ▼                                ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌───────────────────────────────┐
│     PostgreSQL 16+ Database   │ │        Elasticsearch          │ │    Redis (Port 6379)          │
│   (Prisma ORM - Normalized)   │ │  - Full-text search index     │ │  - BullMQ Delayed Job Queue │
│  - User & Sender Accounts     │ │  - Recipient, subject, body   │ │  - Atomic Rate Limit Lua    │
│  - EmailCampaign & Records    │ │  - Automatic DB fallback      │ │  - Inter-send Delay Slot    │
│  - SlackConnection & Outbox   │ └───────────────────────────────┘ └──────────────┬────────────────┘
└───────────────────────────────┘                                                  │
                                                                                   │ Job Dispatch
                                                                                   ▼
                                          ┌───────────────────────────────────────────────────────┐
                                          │             BullMQ Worker Process                     │
                                          │            (Configurable Concurrency)                 │
                                          ├───────────────────────────────────────────────────────┤
                                          │ • Distributed Rate-Limit Check (Redis Lua)            │
                                          │ • Minimum Inter-Send Delay Coordination (sleep/slot)  │
                                          │ • Hourly Quota Deferral (BullMQ delayed job)          │
                                          │ • Nodemailer Simulated Delivery (Ethereal SMTP)       │
                                          │ • Ethereal Message Preview URL Recording              │
                                          │ • Slack Alert Notifier (Deduplicated per window)      │
                                          │ • Elasticsearch Real-time Record Indexer              │
                                          └───────────────────────────────────────────────────────┘
```

---

### A. How Scheduling Works (Strictly Zero-Cron)

1. **No Polling Loops / No Cron Libraries**:
   - The codebase has **zero instances of `node-cron`**, `cron`, or OS crontabs.
   - When a campaign is submitted with `startTime = T`, the engine calculates:
     $$\text{delay} = \max(0, T - \text{now})$$
   - BullMQ stores the job in Redis using a **Redis Sorted Set (`ZSET`)** with the score equal to the execution timestamp (`now + delay`).
2. **Millisecond-Precision Worker Awakening**:
   - Redis and BullMQ monitor the delay queue using internal Redis timers. When the scheduled timestamp arrives, BullMQ atomically promotes the job from `delayed` to `waiting` for instant worker pickup.

---

### B. How Persistence on Restart is Handled (Transactional Outbox)

1. **Atomic Outbox Commit**:
   - When creating a campaign, the campaign record, individual email items, and an `OutboxEvent` are written in a single atomic PostgreSQL transaction:
     ```typescript
     await prisma.$transaction(async (tx) => {
       const campaign = await tx.emailCampaign.create({ ... });
       await tx.scheduledEmail.createMany({ ... });
       await tx.outboxEvent.create({ ... });
     });
     ```
2. **Deterministic BullMQ Job IDs**:
   - Every email record has a deterministic job ID:
     `jobId: job-${campaignId}-${index}-${recipientHash}`
   - If a crash occurs before Redis insertion, the startup recovery pass reads pending events from the database and safely re-enqueues them. BullMQ automatically deduplicates by deterministic ID.
3. **Crash Resilience Across Server Restarts**:
   - If the API or Worker crashes, jobs residing in Redis remain persisted in memory and on disk (AOF / RDB).
   - Once the server boots back up, BullMQ resumes dispatching without dropping or duplicating a single email.

---

### C. How Rate Limiting & Concurrency are Implemented

1. **Atomic Redis Lua Script**:
   Rate limits are enforced at the Redis level via an atomic Lua script (`apps/worker/src/lib/rateLimiter.ts`). This guarantees that concurrent worker threads cannot race or exceed limits:
   ```lua
   local current = redis.call('INCR', key)
   if current == 1 then
     redis.call('EXPIRE', key, ttl)
   end
   if current > maxLimit then
     return 0
   end
   return 1
   ```
2. **Inter-Send Delay Coordination**:
   To enforce a minimum delay (e.g. 2000ms) between sends across parallel workers:
   - Redis coordinates an atomic reservation timestamp:
     $$\text{nextAllowedTs} = \max(\text{now}, \text{lastSentTs}) + \text{minDelayMs}$$
   - Any worker attempting to send earlier will sleep for the exact difference before dispatching via Nodemailer.
3. **Graceful Deferral (Zero Drop Guarantee)**:
   - When the hourly quota is reached, jobs are **never marked failed or dropped**.
   - Instead, the worker recalculates the delay until the next hourly window and reschedules the job in BullMQ:
     $$\text{deferDelay} = \text{nextHourTimestamp} - \text{now}$$
   - Simultaneously, a deduplicated Block Kit alert is sent to Slack.

---

## 5. List of Features Implemented Matrix

| Component | Feature | Implementation Details | Status |
|---|---|---|---|
| **Backend** | **Strictly Zero Cron** | BullMQ delayed jobs backed by persistent Redis; zero cron libraries | ✅ Complete |
| **Backend** | **Transactional Outbox** | Atomic PostgreSQL transaction + idempotent recovery dispatcher | ✅ Complete |
| **Backend** | **Deterministic Job Deduplication** | Jobs keyed by `job-${campaignId}-${index}-${hash}` to guarantee no duplicate sends | ✅ Complete |
| **Backend** | **Atomic Rate Limiter** | Redis Lua script enforcing hourly limits per sender | ✅ Complete |
| **Backend** | **Inter-Send Delay Coordination** | Cross-worker atomic delay slots (e.g., 2000ms spacing) | ✅ Complete |
| **Backend** | **Hourly Quota Deferral** | Auto-reschedules overflow jobs to next window; zero jobs lost | ✅ Complete |
| **Backend** | **Ethereal SMTP Sandbox** | Simulated email delivery capturing Message-ID and live preview links | ✅ Complete |
| **Backend** | **Slack OAuth & Webhooks** | AES-256-GCM encrypted tokens; deduplicated rate-limit alerts | ✅ Complete |
| **Backend** | **Bull Board Queue Telemetry** | Protected queue dashboard at `/admin/queues` | ✅ Complete |
| **Frontend** | **Google Account Chooser** | 1-click Google account picker modal (no password required) | ✅ Complete |
| **Frontend** | **Instant Dev Login** | Fast evaluator login without configuring Google Cloud Console | ✅ Complete |
| **Frontend** | **Email Outreach Dashboard** | Scheduled, Sent, and All Activity tabs matching Figma | ✅ Complete |
| **Frontend** | **Compose Email Modal** | Rich toolbar, recipient chips, delay inputs, hourly limit | ✅ Complete |
| **Frontend** | **Lead List CSV / TXT Upload** | File upload with auto-parsing and email count detection | ✅ Complete |
| **Frontend** | **Scheduled Emails Table** | Amber `Due: ...` badge, recipient, subject, scheduled time | ✅ Complete |
| **Frontend** | **Sent Emails Table** | Green `Sent` badge, sent timestamp, Ethereal link | ✅ Complete |
| **Frontend** | **Reading View Modal** | Detailed email inspection with **"Open on Ethereal.email"** button | ✅ Complete |
| **Frontend** | **Real-Time Badges & Search** | Live count badges on sidebar and tabs; full-text search bar | ✅ Complete |

---

## 6. API Endpoints Reference

### Authentication
- `GET /api/auth/google` — Initiates Google OAuth flow
- `GET /api/auth/google/callback` — Google OAuth code exchange
- `POST /api/auth/dev-login` — 1-click instant session login
- `GET /api/auth/me` — Current authenticated user profile
- `POST /api/auth/logout` — Clears session cookie

### Campaign & Email Management
- `POST /api/campaigns/parse-recipients` — CSV / TXT lead list upload and email validation
- `POST /api/campaigns` — Creates campaign and enqueues jobs via Transactional Outbox
- `GET /api/campaigns` — Lists all outreach campaigns
- `GET /api/emails/scheduled` — Paginated scheduled emails queue
- `GET /api/emails/sent` — Paginated delivered emails with Ethereal links
- `GET /api/emails/:id` — Detailed email inspection
- `GET /api/search?q=...` — Search across recipient, subject, and body

### Slack & Queue Telemetry
- `GET /api/slack/status` — Checks Slack rate-limit webhook status
- `POST /api/slack/test-notification` — Dispatches test rate-limit alert to Slack
- `GET /admin/queues` — Real-time Bull Board queue telemetry dashboard
- `GET /api/health` — PostgreSQL, Redis, and Elasticsearch health checks
