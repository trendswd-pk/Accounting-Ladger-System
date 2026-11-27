# Accounting Ledger — portfolio metadata (`demo-mode/`)

Per the Trends WD portfolio pipeline, **Demo Mode runs inside the main product** (`https://cash.trendswd.com/`), not as a separate twin deploy.

This folder’s job for the portfolio is primarily **`demo.json`** (Live Demo / Play Store buttons + SEO fields).

## How clients enter Demo Mode

1. Open [https://cash.trendswd.com/login](https://cash.trendswd.com/login).
2. Select **Try Demo Mode** (no username/password).
3. Explore the seeded Northline Advisory sample ledger (browser `localStorage` only).
4. Use **Exit Demo Mode** on the banner (or Sign out) to return to login.

Guide: [`Documentation/18-embedded-demo-mode.md`](../Documentation/18-embedded-demo-mode.md).

## `demo.json`

| Field | Value |
|-------|--------|
| `live_demo_url` | `https://cash.trendswd.com/` (main product — same URL as Live Demo) |
| `play_store_url` | Set when the Play listing is public (`id=com.trendswd.cash`) |
| `type` | `web-app` |

**Do not** put passwords in `demo.json`.

## Play Store URL (when live)

```text
https://play.google.com/store/apps/details?id=com.trendswd.cash
```

Paste into `demo.json` → `play_store_url` after the listing is published.

## Legacy twin app (optional / historical)

This directory still contains an older offline Next.js twin used for portfolio captures. New portfolio guidance prefers **in-app Demo Mode only**. Do not point `live_demo_url` at a separate `demo-mode` Vercel Root Directory deploy.

Main app:

```bash
npm install && npm run dev
```

## Branding

Trends WD assets: [logo](https://www.trendswd.com/logo.png) · [favicon](https://www.trendswd.com/favicon.png) · [icon](https://www.trendswd.com/icon.png).
