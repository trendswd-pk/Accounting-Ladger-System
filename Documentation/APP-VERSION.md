# App version

**Current version:** 1.2.4  
**Released:** 2026-11-10

See the full [Changelog](./CHANGELOG.md).

## This release includes
- **`/newentry`** page for adding transactions; mobile bottom nav + control opens it
- Shared ledger menu: **Today's / Latest day transactions** lists every entry on that calendar day
- Secure interactive ledger preview links (PIN + configurable expiry) for account WhatsApp messages
- Settings → **Bank details** (with bank QR upload; run bank_details SQL migrations)
- Transactions **Print preview**: opens `/transactions/{id}/print` with Print + Download PDF
- Dashboard Today/Yesterday expense cards roll over at local midnight (no UTC lag)
- Share links show WhatsApp / messenger link previews (Open Graph card for ledger & voucher PDFs)
- Send WhatsApp: branded progress % (in-app + prep tab) instead of a blank loading page
- Open Graph / Twitter link previews with brand share card
- Mobile bottom tab bar (full-width, safe-area): Home, Account, Add, Expenses, Menu
- Green brand color scheme (Caribbean / Bangladesh / Rich Black) for light + dark
- Offline Demo Mode with per-user sandboxes and realistic sample books
