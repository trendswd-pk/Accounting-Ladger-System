# Email verification & Android App Links

**Version:** 1.7.0  
**Routes:** `/auth/callback`, `/auth/continue`  
**Packages:** web `cash.trendswd.com` · Android `com.trendswd.cash`

## What users experience

1. **Create account** on web or in the APK → if Supabase requires email confirm, they see a message to open the email link.
2. Tap the link:
   - **APK installed** (App Links verified) → opens Accounting Ledger; session is established; ledger bootstrap runs; user lands on the dashboard signed in.
   - **APK not installed** → same `https://cash.trendswd.com/auth/…` URL opens in the browser; same callback → continue → logged-in web app.
3. **Forgot password** stays on `/reset-password` only (`type=recovery` / `next=/reset-password`) — not mixed with verification.

## App behaviour (already in the repo)

| Piece | Role |
|-------|------|
| Signup `emailRedirectTo` | `https://cash.trendswd.com/auth/callback?next=/auth/continue&flow=verify` |
| `/auth/callback` | Exchanges `code` or verifies `token_hash`; sets session cookies; redirects to continue or reset |
| `/auth/continue` | Confirms session (`getUser`), bootstraps ledger, enables biometric unlock flag, enters `/` |
| `CapacitorAuthLinkRouter` | On cold/warm App Link open, navigates the WebView to `/auth/…` (remote `server.url` alone would stay on `/`) |
| `AndroidManifest` | `autoVerify` App Link for `https://cash.trendswd.com/auth*` |
| `/.well-known/assetlinks.json` | Declares `com.trendswd.cash` (+ legacy TWA id) with release SHA-256 |

## Required Supabase Auth URLs

In **Supabase → Authentication → URL configuration**:

**Site URL**

```text
https://cash.trendswd.com
```

**Redirect URLs** (allow list — add all that apply):

```text
https://cash.trendswd.com/auth/callback
https://cash.trendswd.com/auth/callback?next=/auth/continue
https://cash.trendswd.com/auth/callback?next=/auth/continue&flow=verify
https://cash.trendswd.com/auth/continue
https://cash.trendswd.com/reset-password
https://cash.trendswd.com/login
http://localhost:3000/auth/callback
http://localhost:3000/auth/continue
```

Optional wildcard (if your project allows it):

```text
https://cash.trendswd.com/**
```

Confirm the **Confirm signup** email template still uses the Supabase confirmation URL (or `{{ .ConfirmationURL }}`) so the redirect lands on your Site URL / `emailRedirectTo` callback — do not point signup confirms at `/reset-password`.

## Required Digital Asset Links (SHA-256)

Public file (must be live on production after deploy):

`https://cash.trendswd.com/.well-known/assetlinks.json`

Current Capacitor release fingerprint (upload / `android.keystore` alias `android`):

```text
0C:0B:DE:93:27:72:74:08:14:29:9E:35:FC:4F:6A:D1:23:1A:D2:70:2F:B0:76:22:97:22:69:49:A9:BE:E6:80
```

Package name in that file: **`com.trendswd.cash`** (not the old TWA id alone).

### If you change the signing key (e.g. Play App Signing)

1. Get the **App signing key certificate** SHA-256 from Play Console (or `apksigner verify --print-certs` on the distributed APK).
2. Put that colon-separated hex string into `public/.well-known/assetlinks.json` under `com.trendswd.cash`.
3. Deploy the web app so Google can fetch the file.
4. Rebuild/install the APK that includes the App Links `intent-filter`, then verify:

```bash
adb shell pm get-app-links com.trendswd.cash
```

Domain `cash.trendswd.com` should show **verified** for `/auth`.

### Verify assetlinks from a laptop

```bash
curl -sI https://cash.trendswd.com/.well-known/assetlinks.json
# Expect: Content-Type: application/json
curl -s https://cash.trendswd.com/.well-known/assetlinks.json
```

## Deploy checklist

1. Deploy Next.js (callback, continue, assetlinks, signup redirect).
2. Update Supabase redirect allow list (above).
3. Rebuild Android (`npx cap sync android` + signed APK/AAB) so the App Links intent-filter ships.
4. Install on a phone, open a verification email once, confirm it opens the app (or browser if uninstalled).

## Related

- [01 — Login](./01-login.md)
- [17 — Android (Capacitor)](./17-android-capacitor.md)
- [23 — Change password & Forgot / Reset](./23-password-reset.md)
