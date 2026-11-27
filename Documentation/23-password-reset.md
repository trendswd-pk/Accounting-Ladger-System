# Change password & Forgot / Reset

**Version:** 1.7.0  
**Routes:** `/settings/profile` (change), `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/continue`  
**Who can access:** Change — signed-in users. Forgot / Reset — signed-out users (email link). Same screens in the Android Capacitor WebView.

## What this covers

1. **Change password** while signed in (Profile).
2. **Forgot password?** from Login when you cannot sign in.
3. **Reset password** after opening the email recovery link.

Magic link / invite / email OTP sign-in uses the same `/auth/callback` exchanger but is **not** the reset flow: those links go to `/auth/continue` → dashboard. Only `type=recovery` or `next=/reset-password` opens Reset password.

Labels, validation (min **8** characters, match confirmation), and success/error copy match on web and the mobile APK.

## Change password (signed in)

1. Open **Settings → Profile**.
2. Under **Change password**, enter **Current password**, **New password**, and **Confirm new password**.
3. Select **Update password**.
4. Success: session stays active on this device; biometric unlock is cleared so the next unlock uses the new credentials flow.

Wrong current password shows **Current password is incorrect.** Demo Mode disables real password changes on the production app; the portfolio demo-mode app validates the fixed demo password for UX only.

## Forgot / Reset (signed out)

1. On `/login` (Sign in mode), select **Forgot password?**
2. Enter **Email** and select **Send reset link**.
3. Open the email on the same device/browser (or Capacitor app origin).
4. The link hits `/auth/callback` (PKCE code exchange), then `/reset-password`.
5. Enter **New password** and **Confirm new password**, then **Update password**.
6. You are signed in with the refreshed session and redirected to the ledger.

If the link is missing or expired, `/reset-password` asks you to request a new one from Forgot password.

## Supabase / Capacitor setup

In the Supabase project **Authentication → URL configuration**, allow:

- Site URL: your production origin (for example `https://cash.trendswd.com`) — prefer `/` or `/auth/callback`, not a path that drops the auth `code`
- Redirect URLs including:
  - `https://<your-origin>/auth/callback`
  - `https://<your-origin>/auth/continue`
  - `https://<your-origin>/reset-password`
  - `https://<your-origin>/login` (hash-based links are finished client-side)

Forgot-password emails must use `redirectTo` → `/auth/callback?next=/reset-password`. Magic links should use `/auth/callback` (or Site URL); middleware forwards `?code=` / `?token_hash=` to the callback so they are not lost on a Login bounce.

The app builds `redirectTo` from `window.location.origin`, so the Capacitor WebView and website stay on the same host without custom deep-link schemes for this flow.

## Related

- [01 — Login](./01-login.md)
- [13 — Profile](./13-settings-profile.md)
- [17 — Android (Capacitor)](./17-android-capacitor.md)
