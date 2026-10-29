# Accounting Ledger System

Web-based accounting ledger for day-to-day books: accounts, journal entries, balances, expense analytics, exports, and WhatsApp-ready messaging. Built with **Next.js 14**, authenticated access, and cloud storage for both structured data and file attachments.

Deployable to Vercel; installable on mobile as a **PWA** (Add to Home Screen).

---

## Features

### Core ledger
- **Accounts** — ledger accounts with types, cash types, and running balances
- **Transactions** — credit / debit / transfer entries, narration, filters, search, pagination
- **Documents** — multi-file attachments per transaction (any type, compressed before upload)
- **Exports** — account ledger PDF / CSV; transaction PDF with attached images & PDFs merged in

### Dashboard & analytics
- Balance mix (Cash in Pocket, Cash & Savings, Receivable, Payable)
- Monthly expenses (last 6 months) with per-account stacked breakdown
- Daily expenses (this month) with per-account series + total
- Top expense accounts (click-through to filtered transactions)
- Today / Yesterday expense cards → date-filtered transactions

### Messaging & branding
- Editable WhatsApp message templates (accounts & transactions) with dynamic note lines
- Logo / favicon branding stored on object storage
- Theme preference (light / dark)

### Security & access
- Login required for all app routes and APIs (session via Auth)
- Profile page — name, email, password
- Sidebar logout

### Progressive Web App
- Web app manifest + icons
- Service worker for installability
- Home-screen install on Android / iOS Safari

---

## Architecture

| Layer | Role |
|--------|------|
| **Next.js App Router** | UI + API routes |
| **Auth / database** | Users, rows (accounts, transactions, settings, file metadata) |
| **Cloudflare R2** | File bytes (uploads via same-origin `/api/uploads`) |

Business data is **not** stored in `localStorage`. Client modules keep short-lived in-memory caches for snappy navigation after the first fetch.

```
Browser  →  Next.js API  →  Database (rows + auth)
                         →  R2 (file objects)
```

---

## Tech stack

- Next.js 14 · React 18 · TypeScript · Tailwind CSS
- `@supabase/ssr` + `@supabase/supabase-js` (auth & data)
- Recharts · jsPDF / pdf-lib · Lucide icons

---

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

Fill values in `.env.local` (see [Environment variables](#environment-variables)).

### 2. Database

In your project SQL editor, run the single schema file once (safe to re-run):

- [`database/schema.sql`](database/schema.sql) — full schema (types, settings, accounts, transactions, attachments, RPCs, seeds)

See [`database/README.md`](database/README.md) for details. Create at least one Auth user (Dashboard → Authentication → Users) before signing in.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build && npm start   # production
npm run lint                 # ESLint
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_BASE_URL` | Public base URL for objects |
| `R2_FOLDER_PREFIX` | Optional key prefix (e.g. `attachments`) |

Optional: `JWT_SECRET`, `CRON_SECRET` — see `.env.example`.

Uploads use **same-origin** `POST /api/uploads` (server writes to R2), so browser CORS to R2 is not required for that path.

---

## App map

| Path | Description |
|------|-------------|
| `/login` | Sign in |
| `/` | Dashboard |
| `/transactions` | Journal entries (+ filters via query: `accountId`, `dateFrom`, `dateTo`) |
| `/accounts` | Chart of accounts / ledgers |
| `/cash-savings` | Cash & savings view |
| `/payable` · `/receivable` | Payable / receivable |
| `/investment` | Investment |
| `/expenses` · `/expenses/daily` · `/expenses/monthly` | Expense views |
| `/settings` | General, branding, templates, theme |
| `/settings/profile` | User profile |
| `/settings/account-type` · `/settings/cash-type` | Type setup |

---

## Development notes

- **Request Profiler** (dev only) — header icon shows API / request counts and dedupes.
- **PWA** — after deploy over HTTPS, use browser “Install app” / “Add to Home Screen”. Icons live under `public/icons/`.
- UI navigation patterns were informed by a local `Courier-Dashboard/` reference (not shipped as part of this product).

---

## License

Private project — all rights reserved unless otherwise stated.
