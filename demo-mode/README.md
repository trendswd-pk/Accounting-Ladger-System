# Accounting Ledger — Demo Mode

Standalone offline demo of **Accounting Ledger**. No Supabase, R2, or `.env` required. Data lives in browser `localStorage` per demo user.

> **Deploy separately:** Demo Mode is excluded from the main product TypeScript/ESLint build. Deploy this folder as its **own** Vercel project, then set `live_demo_url` in `demo.json`.

## Deploy on Vercel (checklist)

1. **New Vercel project** → Import this GitHub repo.
2. **Root Directory** = `demo-mode` (required — do not use repo root).
3. Framework: Next.js (auto). Build: `npm run build`. Install uses `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` via `vercel.json`.
4. **No environment variables** needed (offline localStorage demo).
5. Node **18+**.
6. After deploy, paste the public URL into `demo.json` → `live_demo_url`.

If deploy stops / uploads empty: ensure the **repo root** `.vercelignore` does **not** list the whole `demo-mode` folder (only junk like `demo-mode/node_modules`). A full `demo-mode` ignore blocks this project.

## Run locally

```bash
cd demo-mode
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## Demo accounts

Use the clickable cards on the login page, or sign in manually:

| Role   | Email             | Password  |
|--------|-------------------|-----------|
| Admin  | admin@admin.com   | admin123  |
| Editor | editor@demo.com   | demo123   |
| Viewer | viewer@demo.com   | view123   |

Each account has an isolated sandbox. First login seeds **Northline Advisory** (PKR) with account types, cash types, accounts, and sample transactions.

Reset anytime via **Reset demo data** in the sidebar.

## `demo.json`

```json
{
  "live_demo_url": "",
  "type": "web-app"
}
```

**TODO:** After you deploy this demo, set `live_demo_url` to the public URL. Do not put passwords in `demo.json`.

## Screenshots (local only)

```bash
npm i -D playwright
npx playwright install chromium
DOCS_URL=http://localhost:3000 npm run screenshots
```

Playwright is **not** a deploy dependency (avoids Vercel install/timeouts).

## Branding

Favicon: Trends WD (`public/favicon.png` from https://www.trendswd.com/favicon.png).
