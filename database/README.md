# Database

Run in **Supabase → SQL Editor** (safe to re-run):

1. [`schema.sql`](schema.sql) — core tables, seeds, RPCs, `file_attachments`  
2. [`accounts.sql`](accounts.sql) — `accounts` table + `rpc_list_accounts`  
3. [`transactions.sql`](transactions.sql) — `transactions` table + `rpc_list_transactions`  
4. [`transactions-entry-type.sql`](transactions-entry-type.sql) — credit/debit column (if table already created)  
5. [`transactions-narration.sql`](transactions-narration.sql) — narration/details column (if table already created)  
6. [`accounts-balance.sql`](accounts-balance.sql) — account Balance from transactions (re-run `rpc_list_accounts`)  
7. [`settings-default-entry-mode.sql`](settings-default-entry-mode.sql) — default Normal/Transfer entry mode in General settings  
   Or piece-wise: [`rpcs.sql`](rpcs.sql) + [`file-attachments.sql`](file-attachments.sql)

## Storage split

| Where | What |
|---|---|
| **Supabase** | Normal entries + file *metadata* (`file_attachments`) |
| **Cloudflare R2** | File *bytes* (PDF, images, Excel, …) |

Upload flow: `POST /api/uploads/presign` → browser PUT to R2 → `POST /api/uploads/complete` (HEAD verify + insert metadata).

API routes use `SUPABASE_SERVICE_ROLE_KEY` and R2 keys from `.env.local`.
