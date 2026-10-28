# Accounting Ledger System

Double-entry accounting ledger app (journals, ledgers, financial overview).

UI/UX patterns are inspired by the local `Courier-Dashboard/` reference folder (gitignored — not part of this app).

**Storage split (online only):**

- **Supabase** — normal rows (settings, account/cash types, journals, and file *metadata*)
- **Cloudflare R2** — file *bytes* via presigned upload (`lib/r2.ts` + `/api/uploads/*`)

No localStorage for business data.

## Setup

1. Copy `.env.example` → `.env.local` and fill Supabase + R2 values.
2. In Supabase SQL Editor, run [`database/schema.sql`](database/schema.sql) then [`database/rpcs.sql`](database/rpcs.sql).
3. Install and start:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current pages

- **Dashboard** (`/`) — overview placeholders
- **Accounts** (`/accounts`) — ledger accounts (ACC type / cash type / balance placeholder)
- **Account Type** (`/settings/account-type`) — Supabase CRUD table
- **Cash Type** (`/settings/cash-type`) — Supabase CRUD table
- **General** (`/settings`) — business name, currency, theme (Supabase)

Left-side navigation opens from the header menu button.

In **development**, the header gear/funnel icon opens the **Request Profiler** (same as Courier-Dashboard) so you can watch API/Supabase call counts, dedupes, and failures.
