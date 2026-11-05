# Database migrations

Full install / reset: run `../schema.sql`.

For an **already-live** database, run only the dated files in this folder (newest last), in Supabase → **SQL Editor**.

| File | Purpose |
|------|---------|
| `2026-10-30_account_message_ledger_url.sql` | Account WhatsApp ledger URL allow flag + RPC update |
| `2026-10-30_short_links_no_ads.sql` | First-party `/l/{code}` short links (no TinyURL ads) |
| `2026-10-30_transaction_message_pdf_url.sql` | Transaction WhatsApp voucher PDF URL allow flag + RPC update |
| `2026-10-30_transaction_message_ledger_url.sql` | Transaction WhatsApp account-ledger PDF URL allow flag + RPC update |
| `2026-11-05_bank_details.sql` | Settings → Bank details table + list RPC |
| `2026-11-05_bank_details_qr_code.sql` | Bank details `qr_code_url` column + RPC update |
| `2026-11-05_ledger_shares.sql` | PIN-gated interactive ledger preview links (`/share/ledger/{token}`) |

Each file is written to be **idempotent** (safe to re-run).
