# Database

Single source of truth:

**[`schema.sql`](schema.sql)** — full schema (tables, RLS, seeds, RPCs).

## How to apply

1. Open **Supabase → SQL Editor**
2. Paste / run `schema.sql` once (safe to re-run)

## What it includes

| Area | Objects |
|------|---------|
| Types | `account_types`, `cash_types` |
| Settings | `app_settings` (per-user branding, templates, notes, dashboard filters, theme) |
| Ledger | `accounts`, `transactions` (scoped by `user_id`) |
| Files | `file_attachments` (metadata only; bytes on Cloudflare R2) |
| RPCs | `rpc_*` functions take `p_user_id` after the multi-tenant migration |

**Live upgrade:** after `schema.sql`, run dated files under [`migrations/`](migrations/), especially `2026-11-24_multi_tenant_user_id.sql` before enabling signup.

## Clear transactions only (optional)

At the bottom of `schema.sql` there is a commented `TRUNCATE` line. Uncomment and run **only** when you intentionally want to wipe ledger entries (accounts/settings stay).

## Storage split

| Where | What |
|-------|------|
| Database | Rows + file metadata |
| Cloudflare R2 | File bytes |

App uploads: `POST /api/uploads` (server → R2). Use `SUPABASE_SERVICE_ROLE_KEY` and R2 keys from `.env.local`.
