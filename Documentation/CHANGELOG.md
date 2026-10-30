# Changelog

All notable changes to Accounting Ledger are documented here.

## [1.0.1] — 2026-10-30

### Added
- Balance mix ribbons show day-over-day up/down % vs yesterday, with category icons on the colored strip.
- Transactions table headers: click **Transaction Date**, **Type**, or **Balance** to sort ascending/descending.
- Accounts detail popup (row click / Actions → Details) with **Details** and **Documents** tabs, matching the transaction preview.
- Account and transaction detail footers use icon buttons (message, edit, close).
- Account detail: **Save ledger PDF** icon generates the account ledger PDF and stores it in that account’s Documents tab.
- Account **Send message** now generates/saves the ledger PDF and fills **`{{ledger_url}}`** with a shortened public link (or appends it for older templates).
- Account message settings: **Allow URL / Do not send URL** toggle for ledger PDF links, plus insertable `{{ledger_url}}` variable.
- DB migration file for the ledger-URL setting: `database/migrations/2026-10-30_account_message_ledger_url.sql` (run in Supabase SQL editor).
- Ledger WhatsApp links use **ad-free** first-party URLs (`/l/f/{fileId}`, or `/l/{code}` if short_links migration is applied) instead of TinyURL ads. Links are always filled into the message when Allow URL is on.
- Transaction **Send message** now generates/saves a voucher PDF and fills **`{{pdf_url}}`** with a short public link (same Allow URL pattern as accounts).
- Transaction message settings: **Allow URL / Do not send URL** toggle for PDF links, plus insertable `{{pdf_url}}` variable.
- DB migration file for the transaction PDF-URL setting: `database/migrations/2026-10-30_transaction_message_pdf_url.sql` (run in Supabase SQL editor).
- Transaction message can also attach the **account ledger PDF** via **`{{ledger_url}}`**, with its own Allow URL switch next to the transaction PDF toggle (enable either or both).
- DB migration file for the transaction ledger-URL setting: `database/migrations/2026-10-30_transaction_message_ledger_url.sql` (run in Supabase SQL editor).

### Changed
- Dashboard chart cards tighten for mobile (no horizontal overflow; wrapping legends; compact balance-mix ribbons).
- Message template Allow URL control is a single row: heading + info tip on the left, enable/disable switch on the right.
- Message template balance-notes help text is on an info icon next to the heading (account and transaction editors).
- Message template intro copy moved into an info tip beside the modal title (account and transaction).
- Settings info tips no longer use a full-screen overlay (modal body stays scrollable while a tip is open).

### Fixed
- Message template editor **Save** now writes to the database immediately (no need to also click the page Save), and custom templates are no longer reset to defaults on reload.
- Transaction Export PDF no longer duplicates the voucher when a previously saved voucher PDF sits in Documents; uploaded images (including WebP/GIF) rasterize into the PDF instead of showing “Could not render”.
- Today Expense and Yesterday Expense dashboard cards now open Transactions filtered to **Expense accounts only** for that date (not every account’s entries).
- Transaction save is much quicker: single DB round-trip on create/update, no full accounts reload after each entry, modal closes before file uploads, and the list no longer waits on a full-page loading state.
- In-app navigation (dashboard cards, sidebar, etc.) is much snappier: middleware no longer waits on Supabase Auth `getUser()` for page clicks, Links prefetch again, and heavy PDF code loads only when exporting.
- File uploads are much faster: light compression (no gzip on PDFs/images), direct browser→R2 when possible, parallel multi-file uploads, and a quicker finalize step.
- Transaction preview Documents tab loads instantly (prefetch + cache) and shows a file count badge when attachments exist.

## [1.0.0] — 2026-10-29

### Added
- Initial Demo Mode (`demo-mode/`) with offline localStorage sandboxes and professional Northline Advisory seed data.
- Documentation pipeline folder (`Documentation/`) for portfolio publishing.
- Full documentation guides with screenshots (login through settings, plus mobile) under `Documentation/01-login.md`–`16-mobile.md`.
- Playwright screenshots in `Documentation/images/` with `SCREENSHOT-INDEX.md`.
- Cursor rules for CHANGELOG and version discipline (`.cursor/rules/`).
- Trends WD favicon branding on Demo Mode.
- Root production build excludes for `demo-mode/` so the main product deploy stays independent.
- Professional root `README.md` with product overview and documentation screenshots.

### Changed
- (none yet)

### Fixed
- Demo Mode header now shows seeded business name (Northline Advisory) after first login.
- Demo Mode Vercel deploy: stop excluding the whole `demo-mode/` folder in root `.vercelignore` (blocked Root Directory deploys); drop Playwright from deploy install; add `demo-mode/vercel.json`.

