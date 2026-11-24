# Data & Account Deletion

**App name:** Accounting Ledger  
**Developer / brand:** Trends WD  
**Android package:** `com.trendswd.cash`  
**Web app:** [https://cash.trendswd.com/](https://cash.trendswd.com/)  
**Last updated:** 24 November 2026  

This page is the official **account and data deletion** resource for Accounting Ledger (web and Android). It is intended to satisfy Google Play Console requirements for an account-deletion web link, and to help users remove local Demo Mode data.

**Developer contact for deletion requests:** [info@trendswd.com](mailto:info@trendswd.com)  
**Developer website:** [https://www.trendswd.com/](https://www.trendswd.com/)  
**Phone:** +92 305 9778976  

Related: [Privacy Policy](./19-privacy-policy.md) · [Support & Contact](./22-support-and-contact.md)

---

## 1. Overview

Accounting Ledger stores:

- **Cloud account data** (when you sign up / sign in) — authentication and private ledger records in **Supabase**, plus optional file bytes in **Cloudflare R2**
- **Local Demo Mode data** — sample ledger only in the browser / Android WebView **`localStorage`** (not written to the production database for that guest session)

| What you want | What to do |
|---|---|
| Delete individual ledger rows | Use in-app delete while signed in (Section 2) |
| Clear Demo Mode / local sample data | Exit Demo Mode and/or clear site or app storage (Section 3) |
| Delete your **entire account** and associated cloud data | Email Trends WD with the steps in Section 4 |

There is currently **no fully automated “Delete my account” button** inside the app. Full account deletion is completed by **Trends WD** after a verified email request.

---

## 2. Delete ledger data yourself (signed-in users)

These steps remove selected records from **your** private cloud ledger. They do **not** delete your Supabase login by themselves.

1. Open [https://cash.trendswd.com/](https://cash.trendswd.com/) (or the Accounting Ledger Android app) and **Sign in**.
2. Delete what you no longer need:
   - **Transactions** — open the entry and delete it  
   - **Accounts** — open the account and delete it (review related transactions first)  
   - **Settings → Account Type / Cash Type / Bank details** — delete unused setup rows  
   - **Attachments / documents** — remove uploaded files from Details / Documents where available  
3. (Optional) Export CSV or PDF from **Settings** before deleting, if you want a personal backup.

Only your user-scoped data is affected. Other users’ ledgers are not changed.

---

## 3. Clear local / Demo Mode data

**Try Demo Mode** keeps Northline sample books in device storage only.

1. Tap **Exit Demo Mode** on the top banner, or use **Log out / Sign out** while in Demo Mode.  
2. To fully wipe leftover local data:
   - **Browser:** clear site data / cookies for `cash.trendswd.com`  
   - **Android app:** clear the app’s storage in system settings, or uninstall the app  
3. Details: [Embedded Demo Mode](./18-embedded-demo-mode.md)

Uninstalling the Android app removes local WebView / biometric unlock flags on that device. It does **not** delete your cloud account — use Section 4 for that.

---

## 4. Request full account & associated data deletion

Use this path when you want Trends WD to delete your **authentication account** and **cloud data** linked to Accounting Ledger.

### Step 1 — Prepare

1. Sign in and open **Settings → Profile**.  
2. Note the **exact email address** of the account.  
3. (Recommended) Export any records you want to keep.  
4. (Optional) Delete large sets of ledger data yourself using Section 2.

### Step 2 — Contact Trends WD

Send an email to:

**[info@trendswd.com](mailto:info@trendswd.com)**

**Suggested subject:**

`Account deletion request — Accounting Ledger (Trends WD)`

**Include in the message:**

- Your full name (if set on the profile)  
- The **exact account email**  
- The confirmation phrase: **Please delete my Accounting Ledger account and associated data**  
- Whether you use the Android app (`com.trendswd.cash`) and/or [https://cash.trendswd.com/](https://cash.trendswd.com/)  
- Any other detail that helps us locate the account  

You may also use the contact options on [Support & Contact](./22-support-and-contact.md) (same email / phone). Deletion requests by email are preferred so we have a written record.

### Step 3 — Identity verification

Trends WD may reply to confirm that the request comes from the account holder (for example asking you to reply from the same email). We will **not** delete an account based on an unverified request.

### Step 4 — Processing timeline

After a verified request, Trends WD processes deletion **within 30 days** (often sooner). You will receive a confirmation email when the account has been removed or disabled.

---

## 5. What data is deleted

After verification, Trends WD will delete or permanently disable, as applicable:

| Category | Action |
|---|---|
| **Supabase Auth** user for this product | Removed or disabled so you can no longer sign in |
| **Ledger database rows** scoped to your `user_id` | Deleted or anonymized (accounts, transactions, settings, account types, cash types, bank details, ledger-share rows, upload metadata) |
| **Cloudflare R2** file objects clearly tied to your uploads | Removed when identifiable and feasible |
| **Server sessions** for that account | Cleared |
| **Local Demo Mode** data | Already device-local; clear via Section 3 (Trends WD cannot erase another user’s browser from our servers) |

---

## 6. What may be retained (temporarily or for legal/security reasons)

| Category | Retention |
|---|---|
| **Encrypted / access-controlled backups** | May retain residual copies for a short rolling backup window until those backups expire or rotate |
| **Security / operational logs** | Aggregated or limited logs (for example IP, timestamps) may be kept briefly for abuse prevention and troubleshooting, then aged out per normal log retention |
| **Legal / billing records** | Kept only if a separate paid agreement or law requires it (usually **not** applicable to the free portfolio / demo deployment) |
| **Data already shared by you** | Content you exported, messaged (for example WhatsApp), or shared via a ledger link may still exist outside our systems with recipients; we cannot delete copies others already received |

We do **not** keep your full ledger “on file” for marketing after a completed deletion request.

---

## 7. Google Play users

If you installed **Accounting Ledger** by **Trends WD** from Google Play (`com.trendswd.cash`):

1. Use **Section 4** on this page to request cloud account and data deletion.  
2. After confirmation (or whenever you wish), uninstall the app from your device to remove local data.  

This URL (once published under Trends WD documentation) is the web resource to enter in Google Play Console under **App content → Data safety / Account deletion**.

---

## 8. Contact Trends WD

| | |
|---|---|
| **Developer** | Trends WD |
| **App** | Accounting Ledger |
| **Email** | [info@trendswd.com](mailto:info@trendswd.com) |
| **Website** | [https://www.trendswd.com/](https://www.trendswd.com/) |
| **Phone** | +92 305 9778976 |
| **Privacy Policy** | [19 — Privacy Policy](./19-privacy-policy.md) |
| **Terms** | [20 — Terms & Conditions](./20-terms-and-conditions.md) |
| **Support** | [22 — Support & Contact](./22-support-and-contact.md) |
