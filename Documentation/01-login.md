# Login

**Version:** 1.7.0  
**Route:** `/login`  
**Who can access:** Anyone signed out. Production users can sign in or create a new account. Guests can open **Try Demo Mode**.

## Screenshot

![Demo Mode login with account cards](./images/01-login.png)

## What this page does

Signs you into Accounting Ledger, creates a new private ledger for your business, or starts **Try Demo Mode** with sample books stored only in this browser.

In **production**, each login owns its own data: accounts, transactions, settings, and business name are not shared with other users.

**Try Demo Mode** does not call Supabase mutations — see [18 — Embedded Demo Mode](./18-embedded-demo-mode.md).

## Layout at a glance

- Product icon and heading: **Sign in** or **Create account** (info icon explains privacy)
- Form fields: **Email**, **Password** (and on signup: **Business name**, **Confirm password**)
- On Sign in: **Forgot password?** link under Password
- Primary action: **Sign in** or **Create account**
- Divider **or**
- Secondary action: **Try Demo Mode** (browser-only sample ledger)
- Toggle link: **Create an account** / **Sign in**

## Steps

### Sign in (production)

1. Open `/login`.
2. Enter **Email** and **Password**.
3. Select **Sign in**.
4. The app opens your private dashboard (or the `next` path when provided).

### Forgot password (production)

1. On Sign in, select **Forgot password?**
2. Enter your email on `/forgot-password` and select **Send reset link**.
3. Open the email link (works in browser and Capacitor WebView on the same site origin).
4. Choose a new password on `/reset-password` (min 8 characters).

See [23 — Change password & Forgot / Reset](./23-password-reset.md).

### Create account (production)

1. On `/login`, select **Create an account**.
2. Enter **Business name**, **Email**, **Password**, and **Confirm password** (min 6 characters).
3. Select **Create account**.
4. If email confirmation is required, check your inbox and open the verification link (opens the APK when installed, otherwise the browser). The link completes verification and signs you in — see [24 — Email verification & App Links](./24-email-verification-app-links.md).
5. If the session starts immediately, you land on the dashboard with default account/cash types and your business name.

### Try Demo Mode

1. Open `/login` while signed out.
2. Select **Try Demo Mode** (no credentials).
3. The dashboard opens with Northline Advisory sample data; a banner offers **Exit Demo Mode**.
4. Edits stay in this browser only. Exit returns to `/login`.

## Fields

| Field | Required | Notes |
|-------|----------|--------|
| Business name | Signup only | Stored on the user and applied to ledger settings |
| Email | Yes (auth) | Used for Supabase Auth |
| Password | Yes (auth) | Min 6 characters on signup |
| Confirm password | Signup only | Must match password |

## Related

- [23 — Change password & Forgot / Reset](./23-password-reset.md)
- [18 — Embedded Demo Mode](./18-embedded-demo-mode.md)
- [02 — Dashboard](./02-dashboard.md)
- [13 — Profile](./13-settings-profile.md)
