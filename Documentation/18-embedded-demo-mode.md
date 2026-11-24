# Embedded Demo Mode (main app)

Reviewers and guests can try the live Accounting Ledger UI from `/login` without credentials. Sample ledger data lives in **browser `localStorage` only** — Demo Mode never writes to Supabase or the production database.

> The separate `demo-mode/` portfolio deploy remains a standalone Next.js app. This guide covers **embedded** Demo Mode inside the main product.

## How it works

1. On `/login`, **Try Demo Mode** sets cookie `als_demo_mode=1` and a guest session in `localStorage`.
2. `middleware.ts` allows page navigation when that cookie is present (no Supabase session required).
3. Client data helpers (`lib/accounts`, `lib/transactions`, settings, banks, types, uploads, dashboard, ledger share) detect Demo Mode and read/write `lib/embeddedDemo/*` storage instead of calling `/api/*`.
4. A banner shows **Demo Mode** with **Exit Demo Mode** (returns to `/login` and clears the demo cookie/session).
5. Real sign-in / sign-up clears any demo session first. API routes stay auth-protected; accidental `/api` calls without a Supabase user still fail closed.

## Verification

### Login page
1. Open `/login` signed out.
2. Confirm **Try Demo Mode** appears under the form (with a short browser-only note).
3. Confirm normal **Sign in** / **Create account** still work when credentials are provided.

### Demo Mode
1. Click **Try Demo Mode**.
2. You should land on the dashboard with Northline Advisory sample accounts, balances, and expenses.
3. Banner: “Demo Mode” + **Exit Demo Mode**.
4. Create/edit/delete an account or transaction — changes persist after refresh in the same browser, and network tab should show **no** successful mutation to `/api/accounts` or `/api/transactions` for those actions.
5. **Exit Demo Mode** (banner or Sign out) returns to `/login`; re-entering demo restores the seeded sandbox (same browser keys unless wiped).

### Real authentication (unaffected)
1. Sign in with a real account — demo cookie/session must be cleared; you see **your** ledger only.
2. Sign out returns to `/login`; middleware still blocks app routes without a session **or** demo cookie.
3. While signed in for real, `/login` still redirects to `/` (demo cookie must not override a real session).
