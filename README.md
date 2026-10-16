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

## 🛠️ Complete Step-by-Step Execution Guide

This section explains how to run the entire system locally from scratch.

### 📋 Prerequisites & Default Ports

| Service | Port | Description |
|---|---|---|
| **Node.js** | >= 18.0.0 (v20 or v22 recommended) | Monorepo runtime |
| **PostgreSQL** | `5432` | Relational storage for campaigns, users, and outbox |
| **Redis** | `6379` | BullMQ delayed job queue & atomic rate limiting |
| **Backend API** | `4000` | Express.js REST API server & Bull Board (`/admin/queues`) |
| **Frontend Web** | `5173` | React 18 + Vite dashboard |
| **Elasticsearch** (Optional) | `9200` | Full-text search (DB fallback engages automatically if offline) |

---

### Step 1: Environment Configuration

Copy the sample environment file to `.env` in the root directory:

```bash
# On Linux / macOS / Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

> **Note for Reviewers & Evaluators**: The default `.env` is pre-configured to connect to `localhost:5432` (`postgres:1234`) and `localhost:6379`. You do **not** need external Google or Slack credentials to run or test the full system; an instant one-click Dev Demo login is included out of the box!

---

### Step 2: Start Redis & PostgreSQL

Choose whichever method matches your environment:

#### Option A: Using Docker Compose (Recommended for clean environments)
If you have Docker installed, start PostgreSQL, Redis, and Elasticsearch with one command:

```bash
docker compose up -d
```

#### Option B: Using Native / Local Services
- **PostgreSQL**: Ensure PostgreSQL is running on port `5432`. Create a database named `reachinbox_db` if it does not already exist:
  ```sql
  CREATE DATABASE reachinbox_db;
  ```
- **Redis**: Start Redis server on port `6379`:
  - **Linux / macOS**: `redis-server`
  - **Windows**: Run the pre-bundled Redis binary:
    ```powershell
    & ".\tools\redis\redis-server.exe" --port 6379 --bind 127.0.0.1
    ```

---

### Step 3: Install Dependencies & Initialize Database

Run from the root directory:

```bash
# 1. Install all dependencies across the monorepo workspaces
npm install

# 2. Build the shared TypeScript library
npm run build --workspace=@reachinbox/shared

# 3. Push the Prisma schema to your PostgreSQL database
npm run db:push
```

---

### Step 4: Run the Application Services

Start the three core services in separate terminal windows:

#### 🖥️ Terminal 1: Backend REST API Server
```bash
npm run dev:api
```
- Listens on: **`http://localhost:4000`**
- Health check: **`http://localhost:4000/api/health`**
- Bull Board Queue Telemetry: **`http://localhost:4000/admin/queues`**

#### ⚙️ Terminal 2: BullMQ Queue Worker Process
```bash
npm run dev:worker
```
- Processes delayed jobs with concurrency = 5.
- Enforces distributed rate limiting & atomic inter-send delay via Redis.
- Delivers emails to Ethereal SMTP fake inbox and captures live preview URLs.

#### 🌐 Terminal 3: React Frontend Web Dashboard
```bash
npm run dev:web
```
- Runs the Vite development server at: **`http://localhost:5173`**

---

### Step 5: How to Test & Verify in Browser

1. **Access the Dashboard**:
   Open **`http://localhost:5173`** in your browser.
2. **Instant Evaluator Login**:
   On the Login page, click **"Enter Dashboard (Instant Dev Session)"**. This authenticates you immediately with the evaluator profile (`Oliver Brown`, `oliver.brown@domain.io`) without needing Google Cloud credentials.
3. **Schedule Emails via Compose Modal**:
   - Click the green **"Compose New Email"** button.
   - Enter a Subject, Body, and Recipients (or upload a `.csv` / `.txt` lead list to see the parsed email counter).
   - Configure **Delay between 2 emails** (e.g., `2` sec) and **Hourly Limit** (e.g., `50`).
   - Click **Send Later ▾** and pick a preset (Tomorrow 10am, 1pm, 3pm, or Pick date & time) or click **"Send Now"**.
4. **Inspect Scheduled & Sent Tables**:
   - Switch between **Scheduled Emails** (amber `Due: ...` badge) and **Sent Emails** (green `Sent` badge).
   - Click any sent email row to open the Reading View and click the external link icon **`↗`** to view the live rendered email on `ethereal.email`.
5. **View Real-Time Queue Telemetry**:
   - Open **`http://localhost:4000/admin/queues`** to view Bull Board displaying active, delayed, waiting, and completed jobs.

---

### Step 6: Testing Server Restart Resilience (Crash Survival)

To demonstrate that jobs are never lost or duplicated across restarts:
1. In the Compose modal, schedule 5 emails to be sent 2 minutes in the future.
2. Verify the jobs appear in the **Scheduled Emails** tab and in Bull Board under "Delayed".
3. Kill the Backend API and Worker terminal processes (`Ctrl+C`).
4. Wait 15 seconds.
5. Restart both services (`npm run dev:api` and `npm run dev:worker`).
6. Observe that when the scheduled time arrives, all jobs are picked up and delivered on schedule without losing state or duplicating sends!

---

### Step 7: Production Build & Execution (Optional)

To test production artifacts rather than development mode:

```bash
# 1. Build all packages and applications
npm run build

# 2. Run API in production
node apps/api/dist/index.js

# 3. Run Worker in production
node apps/worker/dist/index.js

# 4. Preview Frontend bundle
npm run preview --workspace=reachinbox-web
```

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
