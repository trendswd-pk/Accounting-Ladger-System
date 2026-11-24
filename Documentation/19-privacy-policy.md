# Privacy Policy

**Product:** Accounting Ledger  
**Developer / brand:** Trends WD  
**Effective date:** 24 November 2026  
**Applies to:** the web app at [https://cash.trendswd.com/](https://cash.trendswd.com/), the Android Capacitor app (`com.trendswd.cash`), and related documentation hosted under Trends WD.

This Privacy Policy explains what information Accounting Ledger collects, how it is used and stored, and the choices available to you. By creating an account or using the product, you acknowledge this policy.

## 1. Who we are

Accounting Ledger is developed and published by **Trends WD** (Pakistan).

| | |
|---|---|
| **Website** | [https://www.trendswd.com/](https://www.trendswd.com/) |
| **Email** | [info@trendswd.com](mailto:info@trendswd.com) |
| **Phone** | +92 305 9778976 |

For how to reach us about privacy or support, see [Support & Contact](./22-support-and-contact.md).

## 2. What this app does

Accounting Ledger is a **bookkeeping / accounting ledger** application. Signed-in users keep private business records such as accounts, journal (credit/debit) transactions, balances, expense views, bank details, branding settings, and optional file attachments.

It is **not** a bank, payment processor, or tax-filing service. You enter and manage your own financial notes; Trends WD does not provide financial, legal, or tax advice based on that data.

## 3. Information we collect

### 3.1 Account and authentication

When you sign up or sign in we process:

- **Email address** and **password** (password is handled by Supabase Auth; we do not store plaintext passwords in application tables)
- Optional **display name** / profile metadata
- **Business name** (from signup or settings)
- Auth session cookies / tokens required to keep you signed in

Authentication emails (for example confirmation or password reset, when enabled) are sent through the configured auth email path (Supabase Auth, which may use custom SMTP such as Resend on a Trends WD domain).

### 3.2 Accounting and business records you create

Per signed-in user (scoped by `user_id`), the app may store:

- Chart of **accounts** (name, phone, type assignments, balances derived from journals)
- **Transactions** / journal lines (date, narration, credit/debit, amounts)
- **Account types**, **cash types**, and **bank details** (including IBAN and related fields you enter)
- **App settings** (currency, theme, message templates, dashboard preferences, logo/favicon URLs)
- **File metadata** for uploads (file name, type, size, storage key, public URL)
- **Ledger share** records (token, optional PIN hash, expiry) when you create a share link

You control the content of these records. Do not enter data you are not allowed to store.

### 3.3 Files and attachments

Uploaded files (receipts, logos, vouchers, bank QR images, and similar) are stored as **object bytes** in **Cloudflare R2**. Database rows keep metadata and public URLs; file contents are not stored inside Supabase table columns.

### 3.4 Device and technical data

Depending on how you use the product, technical data may include:

- Standard web/server logs (IP address, user agent, timestamps) from hosting
- App preference data in the browser (for example theme)
- On the **Android Capacitor app**: local flags for **biometric unlock** (fingerprint / device credential). Biometrics unlock an existing signed-in session on device; Trends WD does not receive your fingerprint images

### 3.5 Demo Mode (local only)

**Try Demo Mode** and the separate portfolio Demo Mode build use **browser / WebView `localStorage`** (and a demo cookie for navigation). Sample ledger data stays on the device. Demo Mode **does not** write accounting rows to the production Supabase database for that guest session. Clearing site data or exiting Demo Mode removes or abandons that local sandbox as described in [Embedded Demo Mode](./18-embedded-demo-mode.md).

### 3.6 What we do not intentionally collect

- We do not sell personal data
- We do not require government ID numbers to use the ledger
- We do not use your ledger contents for advertising profiles

## 4. How we use information

We use the information above to:

- Create and secure your account and private ledger
- Provide app features (lists, dashboards, exports, WhatsApp message templates, share links, uploads)
- Send necessary auth-related email when configured
- Maintain, troubleshoot, and improve reliability and security
- Respond to support and deletion requests
- Comply with applicable law

## 5. Legal bases (where applicable)

Where data-protection law requires a legal basis, we typically rely on:

- **Contract / service delivery** — operating the account and ledger you requested
- **Legitimate interests** — security, abuse prevention, and product integrity
- **Consent** — where you choose optional features (for example Demo Mode, biometric unlock, uploads)
- **Legal obligation** — when we must retain or disclose information under law

## 6. Third-party infrastructure

Accounting Ledger depends on reputable processors to run the product:

| Provider / layer | Role |
|---|---|
| **Supabase** | Authentication, Postgres database for ledger rows and file metadata |
| **Cloudflare R2** | Object storage for uploaded file bytes |
| **Hosting** (for example Vercel or equivalent) | Serves the Next.js web application |
| **Email / SMTP** (for example Resend or other SMTP via Supabase Auth) | Auth-related email delivery |
| **Google / device OS** (Android) | App distribution and on-device biometric APIs when you enable unlock |

Each provider processes data under its own terms and security controls. We configure access so application APIs enforce authentication and per-user isolation for ledger data.

## 7. Sharing of information

We do not sell your personal information. We may share data only:

- With the infrastructure providers above, as needed to run the service
- When you generate a **ledger share link** — recipients who open the link can see the shared account preview you chose (PIN-gated when enabled)
- If required by law, regulation, or valid legal process
- To protect the rights, safety, or integrity of users or Trends WD
- With your direction (for example when you export or send a message yourself)

## 8. Retention

- Account and ledger data are retained while your account remains active
- After a verified deletion request, we remove or anonymize account-linked application data as described in [Data & Account Deletion](./21-data-account-deletion.md), subject to short technical backups and legal holds where required
- Demo Mode data remains on your device until you clear it or leave Demo Mode
- Server logs are retained only as long as needed for operations and security

## 9. Security

We apply practical safeguards appropriate to this product, including:

- Sign-in required for production ledger routes (middleware and API checks)
- Per-user scoping of ledger records
- Service-role database access limited to server-side APIs
- HTTPS for the hosted site
- Optional biometric gate on the Android app after a successful sign-in
- Hashed PINs for interactive ledger shares when PIN is required

No method of transmission or storage is 100% secure. Please use a strong unique password and sign out on shared devices.

## 10. International processing

Trends WD is based in Pakistan. Infrastructure providers may process data in other regions. By using the service you understand that your information may be transferred to and processed in countries where those providers operate.

## 11. Your rights and choices

Depending on your location, you may have rights to access, correct, export, restrict, or delete personal data, or to object to certain processing. You can:

- Update profile name and many settings inside the app
- Delete individual accounts, transactions, types, banks, and uploads you no longer need
- Sign out; on Android, logout clears biometric unlock preferences for the app
- Exit Demo Mode or clear browser/site storage for local demo data
- Request full account / data deletion — see [Data & Account Deletion](./21-data-account-deletion.md)

To exercise rights, contact [info@trendswd.com](mailto:info@trendswd.com) with the subject line **Privacy request — Accounting Ledger** and the email used for your account.

## 12. Children

Accounting Ledger is intended for business and adult users. It is not directed at children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children.

## 13. Android / Google Play

The Android app loads the live web product in a Capacitor WebView (`https://cash.trendswd.com/`). The same privacy practices apply. This Privacy Policy URL may be linked from Google Play Console for the listing `com.trendswd.cash`.

## 14. Changes

We may update this Privacy Policy when the product or legal requirements change. The **Effective date** at the top will be revised. Continued use after an update means you accept the revised policy where permitted by law.

## 15. Contact

**Trends WD**  
Email: [info@trendswd.com](mailto:info@trendswd.com)  
Web: [https://www.trendswd.com/](https://www.trendswd.com/)  
Phone: +92 305 9778976  

Related pages: [Terms & Conditions](./20-terms-and-conditions.md) · [Data & Account Deletion](./21-data-account-deletion.md) · [Support & Contact](./22-support-and-contact.md)
