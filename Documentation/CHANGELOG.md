# Changelog

All notable changes to Accounting Ledger are documented here.

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

