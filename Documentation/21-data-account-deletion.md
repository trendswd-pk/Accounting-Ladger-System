# Data & Account Deletion

**Product:** Accounting Ledger  
**Developer / brand:** Trends WD  
**Last updated:** 24 November 2026  

This page explains how to remove ledger data you control in the app, and how to request **full account deletion** (including authentication identity) for Google Play and privacy compliance.

Production app: [https://cash.trendswd.com/](https://cash.trendswd.com/)  
Package (Android): `com.trendswd.cash`

## Quick summary

| Goal | How |
|---|---|
| Delete selected ledger rows | Sign in → use in-app delete on Accounts, Transactions, Types, Banks, Uploads |
| Clear Demo Mode sample data | Exit Demo Mode and/or clear site data for the app origin |
| Delete entire account + cloud data | Email Trends WD (steps below) — there is no fully automated “delete my account” button yet |

---

## A. Delete data yourself (while signed in)

These actions remove records from **your** private ledger in the production database (scoped to your user). They do **not** by themselves delete your Supabase Auth login.

1. Open [https://cash.trendswd.com/](https://cash.trendswd.com/) and **Sign in**.
2. Delete what you no longer need:
   - **Transactions** — open the journal / entry and delete
   - **Accounts** — open the account and delete (ensure you understand related transactions)
   - **Settings → Account Type / Cash Type / Bank details** — delete unused setup rows
   - **Attachments** — remove uploaded files from the relevant Details / Documents UI where available
3. Optional: export CSV/PDF first from Settings if you want a personal backup before deleting.

Changes apply to your account only. Other users’ ledgers are not affected.

---

## B. Clear Demo Mode (local device only)

Demo Mode does **not** write your guest sandbox to the real database.

1. Tap **Exit Demo Mode** on the banner, or use **Log out / Sign out** while in Demo Mode.
2. To wipe leftover browser storage: clear site data / cookies for `cash.trendswd.com` (or localhost when developing), or clear the Android WebView data for the app.
3. See [Embedded Demo Mode](./18-embedded-demo-mode.md) for behavior details.

---

## C. Request full account & data deletion

Use this when you want Trends WD to remove your **authentication account** and associated **cloud ledger data** (database rows and related upload objects where identifiable).

### Step 1 — Prepare

1. Sign in and note the **email address** on **Settings → Profile**.
2. (Recommended) Export any records you want to keep.
3. (Optional) Delete large sets of data yourself first using section A.

### Step 2 — Email the request

Send an email to:

**[info@trendswd.com](mailto:info@trendswd.com)**

Suggested subject:

`Account deletion request — Accounting Ledger`

Include:

- Full name (if used on the profile)
- Exact **account email**
- Confirmation phrase: **Please delete my Accounting Ledger account and associated data**
- Whether you also used the Android app `com.trendswd.cash`
- App URL you use (usually `https://cash.trendswd.com/`)

### Step 3 — Verify

We may reply from Trends WD to confirm the request came from the account holder (for example asking you to reply from the same email or confirm a detail). We will not delete an account based on an unverified request.

### Step 4 — What we delete

After verification, Trends WD will, within a reasonable period (typically **within 30 days**, often sooner):

- Remove or disable your **Supabase Auth** user for this product
- Delete or anonymize application data linked to your `user_id` (accounts, transactions, settings, types, banks, share rows, upload metadata) as implemented in our systems
- Remove associated **Cloudflare R2** objects that are clearly tied to your uploads when feasible
- Clear server-side sessions for that account

### Step 5 — What may remain briefly

- Encrypted or access-controlled **backups** may retain residual copies for a short rolling window until they expire
- **Billing or legal** records if a paid agreement required them (usually not applicable to the free portfolio demo)
- Aggregated, non-identifying logs used for security

### Step 6 — After deletion

- You will no longer be able to sign in with that account
- On Android, uninstall the app if you no longer need it; uninstalling alone does **not** delete cloud data — complete section C for that
- If you only wanted local Demo Mode cleared, section B is enough

---

## D. Google Play users

If you installed Accounting Ledger from Google Play:

1. Follow **section C** to delete cloud account data.
2. Uninstall the app from your device to remove the local WebView shell and on-device biometric unlock flags.

This document is the in-product / documentation deletion guide linked from our Privacy Policy for store compliance.

---

## Contact

**Trends WD**  
Email: [info@trendswd.com](mailto:info@trendswd.com)  
Web: [https://www.trendswd.com/](https://www.trendswd.com/)  
Phone: +92 305 9778976  

Related: [Privacy Policy](./19-privacy-policy.md) · [Terms & Conditions](./20-terms-and-conditions.md) · [Support & Contact](./22-support-and-contact.md)
