# Database

Run in **Supabase → SQL Editor** (safe to re-run):

1. [`schema.sql`](schema.sql) — core tables, seeds, RPCs, `file_attachments`  
2. [`accounts.sql`](accounts.sql) — `accounts` table + `rpc_list_accounts`  
   Or piece-wise: [`rpcs.sql`](rpcs.sql) + [`file-attachments.sql`](file-attachments.sql)

## Storage split

| Where | What |
|---|---|
| **Supabase** | Normal entries + file *metadata* (`file_attachments`) |
| **Cloudflare R2** | File *bytes* (PDF, images, Excel, …) |

Upload flow: `POST /api/uploads/presign` → browser PUT to R2 → `POST /api/uploads/complete` (HEAD verify + insert metadata).

API routes use `SUPABASE_SERVICE_ROLE_KEY` and R2 keys from `.env.local`.
