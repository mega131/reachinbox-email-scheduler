# ReachInbox.ai — Email Outreach Job Scheduler

Production-grade full-stack email outreach scheduling engine built for high concurrency, persistent Redis-backed BullMQ job queues, strict zero-cron architecture, atomic distributed rate-limiting, Ethereal SMTP simulated delivery, Elasticsearch full-text search, and real Slack rate-limit alerting.

---

## 🚀 Key Features & Highlights

- **Google OAuth 2.0 / OpenID Connect**: Real authorization-code flow with state parameter verification, ID token signature & audience validation via `google-auth-library`, stable Google subject ID (`sub`) tracking, and secure HttpOnly cookie sessions. Also includes an instant one-click Dev Demo mode for rapid local evaluation.
- **Strictly Zero Cron**: No `node-cron`, no OS cron, no crontab, and no hidden polling loops. BullMQ delayed jobs backed by persistent Redis manage all future executions.
- **Transactional Outbox Pattern**: Campaign persistence and dispatch events are committed in a single atomic PostgreSQL transaction. An asynchronous, retryable dispatcher enqueues jobs to BullMQ with deterministic IDs, completely surviving server reboots without dropped or duplicated jobs.
- **Atomic Distributed Rate Limiting & Inter-Send Delay**:
  - Minimum delay between sends (e.g. 2000ms) enforced across parallel workers via Redis atomic coordination.
  - Hourly limits enforced via an atomic Redis Lua script.
  - **Graceful Deferral**: When the hourly limit is exhausted, jobs are **never dropped or marked failed**. They are automatically rescheduled to the start of the next hourly window using BullMQ delayed jobs.
- **Slack OAuth & Real Notifications**: Connect Slack via OAuth 2.0 with encrypted token storage (`AES-256-GCM`). Dispatches Block Kit rate-limit alert notifications when hourly quotas are exceeded, with automatic Redis-backed deduplication per window. Can be disconnected and reconnected on the fly without redeployment.
- **Ethereal SMTP Integration**: Simulated email delivery via Nodemailer with persistent test account caching. Captures Message-ID, timestamps, and authorized clickable Ethereal preview URLs (`https://ethereal.email/message/...`).
- **Elasticsearch Full-Text Search**: Indexed search across recipient email, subject, body, and sender with an automatic, resilient PostgreSQL database fallback.
- **Protected Bull Board**: Real-time queue telemetry (`/admin/queues`) displaying active, delayed, waiting, completed, and failed jobs, protected by authentication.
- **Modern ReachInbox SaaS Design**: Sleek dark theme (`#090d16` canvas, slate borders, violet & cyan accents), responsive navigation, CSV drag-and-drop dropzone, live progress bars, and modal record inspection.

---

## 🏗️ Architecture & Component Design

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
│  - Dev Demo Auth Bypass       │  - Transactional Outbox Pattern │  - Queue Telemetry & Metrics  │
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

## 📁 Repository Structure

```
reachinbox-email-scheduler/
├── apps/
│   ├── api/                   # Express.js REST API Server
│   │   ├── src/
│   │   │   ├── config/        # Environment validation via Zod
│   │   │   ├── lib/           # Prisma, Redis, Queue, Outbox, Crypto, Elasticsearch
│   │   │   ├── middleware/    # Auth, Cookie Session, Error Handling
│   │   │   ├── routes/        # Auth, Campaigns, Emails, Search, Dashboard, Slack, Health
│   │   │   ├── services/      # Business logic (Google Auth, Slack, Campaign, Email)
│   │   │   └── index.ts       # API Server Entrypoint & Outbox Recovery
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                # BullMQ Worker Process (Separate Process)
│   │   ├── src/
│   │   │   ├── config/        # Worker configuration
│   │   │   ├── lib/           # Transporter, RateLimiter (Lua), SlackNotifier, ES
│   │   │   ├── processor/     # Core Email Job Processor (Delivery, Deferral)
│   │   │   └── index.ts       # Worker Process Entrypoint & Startup Recovery
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                   # React 18 + Vite + Tailwind CSS Frontend
│       ├── src/
│       │   ├── components/    # Sidebar, Header, EmailDetailModal
│       │   ├── context/       # AuthContext (Google OAuth & Dev Login)
│       │   ├── lib/           # API fetch wrapper
│       │   ├── pages/         # Login, Dashboard, Campaigns, Compose, Emails, Settings
│       │   ├── App.tsx        # Protected routing layout
│       │   ├── index.css      # Custom dark theme and glassmorphic styles
│       │   └── main.tsx
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
│
├── packages/
│   └── shared/                # Shared TypeScript DTOs, Zod Schemas, & Enums
│       ├── src/index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   └── schema.prisma          # PostgreSQL schema (User, Campaign, Record, Slack, Outbox)
│
├── docker-compose.yml         # Containerized PostgreSQL, Redis, Elasticsearch
├── .env.example               # Complete environment variable reference
├── package.json               # Monorepo workspaces configuration
└── README.md
```

---

## ⚙️ Environment Variables Reference

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:1234@localhost:5432/reachinbox_db?schema=public` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `PORT` | API Server port | `4000` |
| `FRONTEND_URL` | Frontend URL for CORS & redirects | `http://localhost:5173` |
| `SESSION_SECRET` | Session cookie signing secret | `reachinbox_session_secret_key_prod_32chars_min` |
| `ENCRYPTION_SECRET` | AES-256 key for Slack tokens (32 chars) | `0123456789abcdef0123456789abcdef` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | `GOCSPX-your-client-secret` |
| `GOOGLE_CALLBACK_URL` | Google OAuth Redirect URI | `http://localhost:4000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | `your-slack-client-id` |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | `your-slack-client-secret` |
| `SLACK_REDIRECT_URI` | Slack OAuth Redirect URL | `http://localhost:4000/api/slack/callback` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint | `http://localhost:9200` |
| `DEFAULT_MIN_DELAY_MS`| Minimum inter-send delay (ms) | `2000` |
| `MAX_EMAILS_PER_HOUR` | Hourly quota per sender | `200` |
| `WORKER_CONCURRENCY`  | BullMQ Worker concurrency | `5` |

---

## 🛠️ Getting Started (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v22 tested)
- **PostgreSQL**: v14+ running locally (or via Docker Compose)
- **Redis**: v5+ (v7 recommended) running on `localhost:6379`

### 2. Start Supporting Infrastructure

**Option A — Using Local Services:**
If PostgreSQL and Redis are installed locally:
- PostgreSQL running on port `5432` with database `reachinbox_db`
- Redis running on port `6379`

**Option B — Using Docker Compose:**
```bash
docker compose up -d
```
This spins up PostgreSQL (`5432`), Redis (`6379`), and Elasticsearch (`9200`).

### 3. Install Dependencies & Build Packages
```bash
# Install all dependencies across the monorepo
npm install

# Build shared package
npm run build --workspace=@reachinbox/shared

# Synchronize Prisma schema with PostgreSQL
npm run db:push
```

### 4. Run Services
In three separate terminal windows:

```bash
# Terminal 1: Backend API
npm run dev:api

# Terminal 2: BullMQ Worker
npm run dev:worker

# Terminal 3: React Frontend
npm run dev:web
```

Open **`http://localhost:5173`** in your browser.

---

## 🔑 External OAuth Configuration Guide

### 1. Google OAuth 2.0 (Sign in with Google)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and navigate to **APIs & Services > Credentials**.
3. Configure the **OAuth Consent Screen**:
   - User Type: **External**
   - Scopes: `.../auth/userinfo.profile`, `.../auth/userinfo.email`, `openid`
4. Create an **OAuth 2.0 Client ID**:
   - Application Type: **Web application**
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://localhost:4000`
   - **Authorized redirect URIs**: `http://localhost:4000/api/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret** into your `.env` file:
   ```env
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
> **Note for Evaluators**: In development mode, you can also click **"Enter Dashboard (Instant Dev Session)"** on `/login` to test the full application immediately without configuring Google Cloud credentials!

---

### 2. Slack OAuth & Rate-Limit Notifications
1. Visit the [Slack API App Dashboard](https://api.slack.com/apps) and click **Create New App** (From scratch).
2. Under **OAuth & Permissions**:
   - Add **Redirect URLs**: `http://localhost:4000/api/slack/callback`
   - Under **Scopes > Bot Token Scopes**, add:
     - `chat:write`
     - `incoming-webhook`
     - `channels:read`
3. Under **Basic Information > App Credentials**, copy:
   - `Client ID` -> `SLACK_CLIENT_ID`
   - `Client Secret` -> `SLACK_CLIENT_SECRET`
4. In the ReachInbox dashboard, navigate to **Integrations & Slack** (`/settings`) and click **"Connect Slack"**.
5. Once authorized, click **"Send Test Notification"** to test live message delivery to your channel!

---

## 📡 API Endpoints Reference

All endpoints (except login callbacks and health) require the authenticated session cookie or `Authorization: Bearer <token>`.

### Authentication
- `GET /api/auth/google` — Initiates Google OAuth 2.0 flow
- `GET /api/auth/google/callback` — Handles Google code exchange and issues session cookie
- `POST /api/auth/dev-login` — Generates a signed session for local testing
- `GET /api/auth/me` — Returns current authenticated user profile
- `POST /api/auth/logout` — Clears session cookie

### Campaign Scheduling
- `POST /api/campaigns/parse-recipients` — Multi-part form upload (`file`). Parses CSV/TXT, validates emails, removes duplicates, and returns a preview without saving.
- `POST /api/campaigns` — Idempotent campaign creation and scheduling using the Transactional Outbox pattern.
- `GET /api/campaigns` — Lists all campaigns with real-time delivery counts.
- `GET /api/campaigns/:id` — Retrieves a specific campaign.

### Email Records & Search
- `GET /api/emails/scheduled?page=1&limit=20` — Lists scheduled and queued emails.
- `GET /api/emails/sent?page=1&limit=20` — Lists delivered emails with Ethereal preview links.
- `GET /api/emails/failed?page=1&limit=20` — Lists failed emails with failure traces.
- `GET /api/emails/:id` — Detailed email record inspection (ownership checked).
- `GET /api/search?q=...&status=...` — Full-text search querying Elasticsearch (with PostgreSQL fallback).

### Slack Integration
- `GET /api/slack/connect` — Initiates Slack OAuth flow.
- `GET /api/slack/callback` — Slack authorization code exchange and token encryption.
- `GET /api/slack/status` — Retrieves Slack connection status.
- `DELETE /api/slack/connection` — Disconnects Slack integration without redeployment.
- `POST /api/slack/test-notification` — Dispatches an immediate test rate-limit alert to Slack.

### System & Telemetry
- `GET /api/dashboard/stats` — Overall KPIs, BullMQ real-time queue counts, and hourly quota utilization.
- `GET /api/health` — PostgreSQL, Redis, and Elasticsearch service health checks.
- `GET /admin/queues` — Protected Bull Board dashboard for queue inspection.

---

## 🔒 Reliability & High-Concurrency Mechanics

### 1. Exactly-Once Job Enqueueing (Transactional Outbox)
To avoid race conditions where database records commit but jobs fail to enqueue in Redis:
1. The campaign, individual email records, and `OutboxEvent` records are committed together in an atomic Prisma `$transaction`.
2. An asynchronous, non-blocking dispatcher picks up `PENDING` outbox events and pushes them to BullMQ with deterministic IDs (`jobId: emailRecord.bullmqJobId`).
3. Outbox events are marked `PUBLISHED` only after BullMQ confirms receipt.
4. On API or worker startup, an automated recovery pass inspects any lingering `PENDING` events and re-enqueues them safely. BullMQ deduplicates deterministic job IDs automatically.

### 2. Distributed Rate Limiting (Atomic Redis Lua Script)
To prevent concurrent worker instances from exceeding hourly quotas or violating inter-send intervals:
- Hourly quotas are managed in Redis with atomic `INCR` and window expiration.
- Minimum delays are coordinated using an atomic reservation slot: `nextAllowedTs = max(now, lastTs) + minDelayMs`.
- If a parallel worker recently transmitted an email, subsequent workers automatically sleep for the exact difference, preventing collisions.
- When an hourly limit is breached, the worker **defers** the email by rescheduling it to the next hour's timestamp (`delay = nextWindow - now`) and issues a deduplicated alert to Slack.

### 3. SMTP Delivery Semantics
SMTP does not provide a universal distributed two-phase commit. If an SMTP server accepts a message and the worker crashes before writing the database update, re-sending blindly would cause duplicate outreach.
- ReachInbox checks terminal states prior to transmission.
- Email records record the specific SMTP `messageId` and test preview URL.
- Transient network errors trigger BullMQ exponential backoff retries.
- Permanent rejections (e.g. invalid recipient syntax) terminate immediately.

---

## 📦 Hiring Assignment Submission & Verification Guide

### 1. GitHub Repository Access
When creating your private GitHub repository for submission, invite the ReachInbox hiring team:
- Collaborators: **`Mitrajit`** and **`Yadav036`**

### 2. Submission Form
Submit your repository link, demo video link, and answers on the official ClickUp form:
- **Link**: [ReachInbox Hiring Assignment Submission](https://forms.clickup.com/9005062261/f/8cbwp3n-8876/6NNNJ92DV93PQTAYST)

---

## 📋 Comprehensive Feature Mapping Matrix

| Category | Requirement | Implementation Details | Status |
|---|---|---|---|
| **Backend** | TypeScript + Express.js | Structured Express server with Zod validation, middleware, and services | ✅ Complete |
| **Backend** | BullMQ + Persistent Redis | Delayed jobs with persistent Redis (`email-dispatch-queue`) | ✅ Complete |
| **Backend** | Strictly Zero Cron | No `node-cron`, OS cron, or crontabs. All timing managed via BullMQ delayed jobs | ✅ Complete |
| **Backend** | Relational Database | PostgreSQL with Prisma ORM (`User`, `Campaign`, `ScheduledEmail`, `OutboxEvent`, `SlackIntegration`) | ✅ Complete |
| **Backend** | Multi-Sender Ethereal SMTP | Nodemailer with automatic test account creation and cached credentials; stores live preview URLs | ✅ Complete |
| **Backend** | Elasticsearch Search | Real-time indexing of emails on schedule and completion with automatic PostgreSQL DB fallback | ✅ Complete |
| **Backend** | Live BullMQ Dashboard | Protected Bull Board mounted at `/admin/queues` with active, delayed, waiting, and completed job inspection | ✅ Complete |
| **Backend** | Crash / Restart Persistence | Transactional Outbox pattern with deterministic job IDs (`job-${campaign.id}-${idx}-${hash}`); resumes future emails on restart | ✅ Complete |
| **Backend** | Rate Limiting & Inter-send Delay | Atomic Redis Lua script enforces hourly limits and distributed worker inter-send spacing | ✅ Complete |
| **Backend** | Hourly Quota Deferral | Overflow jobs automatically rescheduled to start of next hour (never dropped or marked failed) | ✅ Complete |
| **Backend** | Slack Rate-Limit Alerting | OAuth 2.0 with AES-256-GCM encrypted tokens; deduplicated per window | ✅ Complete |
| **Frontend** | React + TypeScript + Tailwind | Built with React 18, Vite, TypeScript, and customized Tailwind CSS matching Figma | ✅ Complete |
| **Frontend** | Google OAuth Login | Real Google OAuth 2.0 / OpenID Connect authorization code flow + Dev Demo evaluator login | ✅ Complete |
| **Frontend** | Header Profile & Logout | Top header shows User Avatar, Name, Email, Slack status, Search bar, and Logout button | ✅ Complete |
| **Frontend** | Scheduled & Sent Email Tabs | Filterable tabs for Scheduled Emails, Sent Emails, and All Activity with real-time badges | ✅ Complete |
| **Frontend** | Primary Compose Button | Prominent `+ Compose` button in sidebar and `Compose New Email` button in header | ✅ Complete |
| **Frontend** | Compose Modal (Figma Aligned) | Subject, rich editor toolbar, To chips, inter-send delay (sec), hourly limit, and Send Later popover | ✅ Complete |
| **Frontend** | CSV / Text Lead List Parsing | File upload parses leads and displays detected email count notification | ✅ Complete |
| **Frontend** | Scheduled Emails Table | Email, Subject, Scheduled time, amber `Due: ...` pill, empty state, and loading state | ✅ Complete |
| **Frontend** | Sent Emails Table | Email, Subject, Sent time, green `Sent` pill, Ethereal preview link, empty & loading states | ✅ Complete |
| **Frontend** | Detailed Email Inspection | Reading view modal matching Figma with attachment pill, highlights, and direct Ethereal link | ✅ Complete |

---

## 🎥 5-Minute Demo Video Walkthrough Guide

Follow this suggested sequence when recording your 5-minute Loom/demo video:

1. **Architecture & Project Overview (0:00 - 0:45)**:
   - Briefly show the monorepo structure (`apps/api`, `apps/worker`, `apps/web`, `packages/shared`, `prisma`).
   - Mention the zero-cron architecture with BullMQ + Redis, PostgreSQL, and Ethereal SMTP.
2. **Google Login & Dashboard (0:45 - 1:30)**:
   - Show the Figma-matching login screen.
   - Log in using Google OAuth (or the instant Dev Demo session).
   - Point out the top header: User avatar, name (`Oliver Brown`), email (`oliver.brown@domain.io`), Slack status, and Logout.
3. **Scheduling an Email Campaign (1:30 - 2:45)**:
   - Click **"Compose New Email"**.
   - Upload a sample CSV or enter multiple recipient leads (point out the detected email count).
   - Configure subject, body, delay between emails (e.g. 2s), and hourly limit.
   - Use the **"Send Later"** popover to schedule for a specific time or choose **"Send Now"**.
   - Show the newly scheduled jobs appearing in the **Scheduled Emails** tab with the amber `Due: ...` badge.
4. **BullMQ Telemetry & Live Delivery (2:45 - 3:30)**:
   - Open the **Bull Board** at `/admin/queues` showing delayed and active jobs.
   - Watch the worker process emails respecting the inter-send delay.
   - Switch to the **Sent Emails** tab to show delivered emails.
   - Click the live Ethereal link to open the rendered email on `ethereal.email`.
5. **Server Restart Resilience Demo (3:30 - 4:15)**:
   - Schedule emails 1-2 minutes in the future.
   - Stop the backend API and worker processes in terminal (`Ctrl+C`).
   - Wait 10 seconds to demonstrate downtime.
   - Restart the API and worker.
   - Show that future emails remain in queue and are delivered at their scheduled time without duplication or loss!
6. **(Bonus) Rate Limiting & Slack Alert (4:15 - 5:00)**:
   - Schedule a campaign exceeding the hourly quota (e.g., hourly limit = 2).
   - Demonstrate in the worker logs that excess jobs are automatically **deferred** to the next hour window.
   - Show the rate-limit alert received in your connected Slack channel.
