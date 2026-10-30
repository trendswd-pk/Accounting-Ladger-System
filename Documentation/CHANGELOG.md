# Changelog

All notable changes to Accounting Ledger are documented here.

## [1.0.1] — 2026-10-30

### Added
- Balance mix ribbons show day-over-day up/down % vs yesterday, with category icons on the colored strip.
- Transactions table headers: click **Transaction Date**, **Type**, or **Balance** to sort ascending/descending.

### Changed
- Dashboard chart cards tighten for mobile (no horizontal overflow; wrapping legends; compact balance-mix ribbons).

### Fixed
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

