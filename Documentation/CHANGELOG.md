# Changelog

All notable changes to Accounting Ledger are documented here.

## [1.1.2] — 2026-11-05

### Added
- Settings → **Bank details**: list / add / edit / delete business bank accounts (name, title, account number, IBAN, branch, SWIFT, notes). Requires Supabase migration `database/migrations/2026-11-05_bank_details.sql`.

### Changed
- Transactions actions: **Export PDF** is now **Print preview**. Opens `{app}/transactions/{id}/print` on your domain (not `about:blank`) with Print + Download PDF toolbar.

## [1.1.1] — 2026-11-04

### Added
- Ledger / voucher share links (`/l/f/…`, `/l/…`) now serve a branded landing page with Open Graph + Twitter preview image so WhatsApp and other messengers show a professional link card (title, description, PDF badge). Direct file redirect still available via `?raw=1`.

### Changed
- Send message: blank white prep tab replaced with branded progress UI (percent + status). Same progress overlay appears on Accounts and Transactions while PDFs/links prepare; then WhatsApp opens in that tab.

### Fixed
- Dashboard **Today Expense** / **Yesterday Expense** now follow the browser’s local calendar (and Asia/Karachi on the server when no client date is sent). Open tabs auto-roll at local midnight and refetch so overnight expenses move to Yesterday without waiting until morning.

## [1.1.0] — 2026-11-03

### Added
- Account phone field: country-code selector (default Pakistan +92); numbers save in international format. WhatsApp / `tel:` links normalize local `03…` / `305…` numbers to `+92…`.
- Link previews (Open Graph + Twitter large image) with brand OG card; set `NEXT_PUBLIC_APP_URL` for the correct absolute URL in production.
- Shared capsule search + circular primary button (`SoftSearchField`) on Accounts, balance lists, and Transactions — mobile and desktop.
- Mobile bottom tab bar fixed full-width at the screen bottom (safe-area aware): icon-only Home, Account, Transactions, Expenses, Menu with soft active chip; brand greens; Menu opens the full sidebar. Desktop unchanged.

### Changed
- Brand-sky mobile cards (Accounts, Transactions, Expenses): soft white ring + ink-header highlight so the dark tab stays visible on dark backgrounds.
- Expense period mobile cards: current month/day shows a **Current** pill beside the title.
- Expense period mobile cards show the amount only (no “Expense :” label prefix).
- Monthly Expense mobile cards show month-over-month spend % (vs prior month) with up/down icons; higher spend is red, lower is green. Empty current/future months omit the % so they do not show a false −100%.
- Expense period mobile cards: year (or day meta) sits on the same row as the title, right-aligned.
- Expense total mobile bar: dark header shows period label on the right (Month / Year Expenses); body title is **Total**.
- Accounts list pages (Accounts + Payable / Receivable / Cash / Investment / Expenses balance lists) use the same curved `brand-sky` / `brand-ink` mobile cards and toolbar sizing as Transactions.
- Mobile account / transaction cards: tapping **⋮** expands action **icons** inline on the title row (Details, Edit, Export/PDF, Send, Delete); desktop tables keep the menu with icons.
- Account mobile cards: curved header shows cash type (left) and phone (right); footer shows day-over-day % only (same basis as Balance Mix) + balance.
- Daily Expense: month/year controls move into a right filter drawer (Transactions-style filter icon on the title row).
- Daily / Monthly Expense mobile lists use the same curved `brand-sky` / `brand-ink` cards as Transactions and Accounts; month/year totals use a matching branded total bar.
- Balance Mix pills match the reference layout (circular icon cap + rounded body) with a **single** brand green scheme (`primary-600`→`primary-400` badge, `primary-50` body); caps use Wallet / Banknote / TrendingUp / TrendingDown.
- Form modal footers put **Cancel** on the left and the primary action (**Add** / **Save** / **Download**) on the right, right-aligned on desktop.
- App brand palette set to the green identity sheet (Rich Black → Caribbean Green → Anti-Flash White): `primary-*`, green-tinted `gray-*`, `brand-*`; Cursor rule + `Documentation/images/color-scheme.jpg`.
- UI font: **Manrope** (web stand-in for Axiforma); light + dark surfaces follow the new neutrals.
- Light theme chrome: stronger `gray-200` borders and table dividers, distinct `primary-50` washes, header/sidebar borders, login/demo banners remapped off leftover blue/slate.
- Transactions mobile list uses `brand-sky` / `brand-ink` curved cards (type label, dual pills, Amount / Running footer).
- Entry form modals (Add Transaction, Accounts, types, message templates) no longer close when clicking the dimmed backdrop — use **Cancel** or **X** so typed fields are not lost.
- Transfer entries save both debit and credit legs in **one** request (no sequential double-save wait).

### Fixed
- Mobile “Back to top” sits above the list pagination bar and bottom tab bar (no longer overlaps pagination).
- Service worker no longer rejects failed fetches (dev console “Failed to fetch” / FetchEvent errors); SW registration is skipped in development so HMR is not intercepted.
- Open Graph / Twitter image routes are public (not blocked by auth middleware) so link previews can load.
- PWA meta includes `mobile-web-app-capable` (Chromium deprecation of apple-only capable tag); `html` suppresses extension-injected hydration noise.
- Account search combobox (transaction forms): ArrowUp / ArrowDown move the highlight and Enter selects on desktop keyboard.
- Account mobile cards: flat day % no longer shows a dash icon — only up/down arrows when the balance moves.
- Account mobile cards no longer crash on Expenses / balance lists (`Minus is not defined`); Today % icons are imported from `lucide-react`.
- Balance Mix day-over-day % now includes receivable/payable accounts that were cleared to zero today (e.g. payment recovery). Previously those accounts left the Receivable/Payable lists and their change was ignored, so the ribbon could stay at `0%`.
- Mobile nav no longer warns about `aria-hidden` on a focused link when the drawer closes; focus returns to the menu button and the panel uses `inert` instead.
- Click / tap no longer shows focus rings app-wide; keyboard Tab still shows `:focus-visible` rings.

## [1.0.3] — 2026-10-31

### Added
- Documentation screenshots for Account Details popup and Account / Transaction message templates (Allow URL toggles).
- Playwright `playwright` devDependency in Demo Mode for `npm run screenshots`.

### Changed
- Full client guide refresh for 1.0.1–1.0.2 features (dashboard Transactions button, sorting, Send message PDF/ledger URLs, profile email view-only, mobile pagination / charts).
- Re-captured all documentation screenshots (25 PNGs) against current Demo Mode UI.
- Documentation home and getting-started point to the live demo URL.

## [1.0.2] — 2026-10-31

### Added
- Dashboard header: **Transactions** button next to **Add** for quick navigation to the Transactions page (icon on mobile).

### Changed
- Profile email is view-only (not editable); only the display name can be saved from Profile.
- Profile guide updated so Email is documented as view-only.
- Root README live demo link matches `demo-mode/demo.json`.

### Fixed
- Dashboard chart axis labels on mobile no longer clip (removed negative chart margins; wider Y-axis for Top expense accounts).
- Dashboard chart hover no longer flashes a solid white box behind the bars (tooltip cursor is a light translucent highlight).
- Top expense accounts chart shows full account names with wrapped Y-axis labels (no ellipsis cut-off).
- Mobile back-to-top button sits higher so it no longer covers table pagination controls.
- Mobile table pagination is compact: first and last page with `…` between (current page shown when in the middle).
- Send message opens a WhatsApp tab immediately on click (no stuck wait / double-taps); PDF links build in parallel and skip the extra shortener round-trip.

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

