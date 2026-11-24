# Login

**Version:** 1.5.0  
**Route:** `/login`  
**Who can access:** Anyone signed out. Production users can sign in or create a new account.

## Screenshot

![Demo Mode login with account cards](./images/01-login.png)

## What this page does

Signs you into Accounting Ledger, or creates a new private ledger for your business.

In **Demo Mode**, sample books are stored in this browser only — there is no production backend. Choose a demo account card for the fastest start, or enter email and password manually.

In **production**, each login owns its own data: accounts, transactions, settings, and business name are not shared with other users.

## Layout at a glance

### Production

- Product icon and heading: **Sign in** or **Create account** (info icon explains privacy)
- Form fields: **Email**, **Password** (and on signup: **Business name**, **Confirm password**)
- Primary action: **Sign in** or **Create account**
- Toggle link: **Create an account** / **Sign in**

### Demo Mode

- Banner: **Demo Mode — offline sample data, no production backend**
- Product title: **Accounting Ledger (Demo)**
- **DEMO ACCOUNTS** — clickable cards for Admin, Editor, and Viewer
- Form fields: **Email**, **Password**
- Primary action: **Sign in**

## Steps

### Sign in (production)

1. Open `/login`.
2. Enter **Email** and **Password**.
3. Select **Sign in**.
4. The app opens your private dashboard (or the `next` path when provided).

### Create account (production)

1. On `/login`, select **Create an account**.
2. Enter **Business name**, **Email**, **Password**, and **Confirm password** (min 6 characters).
3. Select **Create account**.
4. If email confirmation is required, check your inbox, then sign in — your ledger is bootstrapped on first session.
5. If the session starts immediately, you land on the dashboard with default account/cash types and your business name.

### Sign in with a demo account card (Demo Mode only)

1. Open the Demo Mode app.
2. Select **Admin**, **Editor**, or **Viewer**.
3. The app signs you in and opens the [Dashboard](./02-dashboard.md).

## Fields

| Field | Required | Notes |
|-------|----------|--------|
| Business name | Signup only | Shown in the app header and messages |
| Email | Yes | Unique login |
| Password | Yes | Min 6 characters on signup |
| Confirm password | Signup only | Must match password |

## Errors & edge cases

- Empty required fields: clear validation messages above the form.
- Wrong credentials: Supabase error text above the form.
- Passwords do not match / too short: blocked before the request.
- Email confirmation pending: info message asks you to confirm, then sign in.
- Already signed in: visiting a protected page stays in the app; signing out returns here.
- Demo data is per browser and per demo user — clearing site data resets local sandboxes.

## Related links

- [Getting started](./00-getting-started.md)
- [Dashboard](./02-dashboard.md)
- [Mobile](./16-mobile.md)
- [Android Capacitor](./17-android-capacitor.md)
