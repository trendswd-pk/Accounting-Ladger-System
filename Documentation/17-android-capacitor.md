# Android app (Capacitor WebView)

The production site [https://cash.trendswd.com/](https://cash.trendswd.com/) runs inside a **native Android WebView** via [Capacitor](https://capacitorjs.com/). This is separate from the older Bubblewrap Trusted Web Activity (TWA) experiment: there is **no Chrome Custom Tab wrapper** and no Chrome first-run / “Running in Chrome” disclosure.

| Item | Value |
|---|---|
| Package ID | `com.trendswd.cash` |
| Loads | `https://cash.trendswd.com/` (live site; UI stays the Next.js app) |
| Min SDK | 24 |
| App version | `1.6.1` (versionCode 1) |
| Signing key | repo-root `android.keystore` (alias `android`) |
| Native project | `android/` (does **not** replace Next.js `app/`) |

### Status bar / notch

- System status bar stays above the WebView (native `topMargin` from status-bar insets) so “Trends WD” sits below clock / signal icons.
- After a web-only CSS change, redeploy `cash.trendswd.com`. Native shell changes need a new APK.

### Biometric / fingerprint unlock

1. Sign in once with email/password in the Capacitor app (device must have fingerprint / screen lock enrolled).
2. Close the app fully, reopen → **Unlock Ledger** prompt (fingerprint or device PIN).
3. **Use password instead** signs out and opens `/login`.
4. **Log out** in the app clears biometric unlock for that device.
5. Requires the web build on `cash.trendswd.com` to include the biometric gate (deploy after merging), plus a synced APK (`npx cap sync android`).

### Email verification App Links

Verified links under `https://cash.trendswd.com/auth…` open in `com.trendswd.cash` when the APK is installed; otherwise they open in the browser. See [24 — Email verification & App Links](./24-email-verification-app-links.md) for Supabase redirect URLs and `assetlinks.json` / SHA-256 steps.

### Login Password Manager / Autofill

The login form is built for Android Autofill / Google Password Manager inside the Capacitor WebView:

- Email field: `name="username"` + `autocomplete="username"` (paired with `current-password`)
- React controlled state syncs from the DOM after autofill so values are not wiped
- Submit reads live form field values (not only React state)
- Native WebView uses `importantForAutofill=yes`

Redeploy `cash.trendswd.com` for the web form fix; rebuild/sync the APK for the native autofill flag.

### Change password, Forgot / Reset & Magic Link

The APK loads the same Next.js UI as the website, so **Profile → Change password**, **Login → Forgot password?**, and email **Magic Links** work inside the WebView.

- Reset emails use `window.location.origin` → `/auth/callback?next=/reset-password` (same host as `cash.trendswd.com`).
- Magic / invite links use `/auth/callback` → `/auth/continue` → dashboard (not the reset form).
- Allow those redirect URLs in Supabase Auth URL configuration.
- After a successful Profile password change, biometric unlock is cleared so the device does not keep a stale unlock token.
- Full steps: [23 — Change password & Forgot / Reset](./23-password-reset.md).

## Prerequisites

- **JDK 21+** (Capacitor 8 / Android Gradle Plugin require Java 21; JDK 17 is not enough)
- Android SDK (or Bubblewrap’s SDK under `~/.bubblewrap/android_sdk`)
- Node dependencies installed (`npm install`)

```bash
export JAVA_HOME=/home/hacker/.bubblewrap/jdk/jdk-21.0.13.1+2   # or any JDK 21+
export ANDROID_HOME=/home/hacker/.bubblewrap/android_sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
```

## Sync & build

```bash
npm run cap:sync
cd android && ./gradlew assembleRelease bundleRelease
```

Unsigned outputs (when env signing is not set):

- `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

### Optional Gradle signing (password via env only)

```bash
export TRENDSWD_STORE_PASSWORD='your-keystore-password'
export TRENDSWD_KEY_PASSWORD='your-key-password'   # often same as store
cd android && ./gradlew assembleRelease bundleRelease
```

### Single-line sign (APK) — prompts for password

```bash
APKSIGNER="$HOME/.bubblewrap/android_sdk/build-tools/36.1.0/apksigner" && ZIPALIGN="$HOME/.bubblewrap/android_sdk/build-tools/36.1.0/zipalign" && "$ZIPALIGN" -f -p 4 android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/cash-aligned.apk && "$APKSIGNER" sign --ks android.keystore --ks-key-alias android --out capacitor-app-release-signed.apk /tmp/cash-aligned.apk && "$APKSIGNER" verify --print-certs capacitor-app-release-signed.apk
```

### Single-line sign (AAB) — prompts for password

```bash
JARSIGNER="$HOME/.bubblewrap/jdk/jdk-17.0.11+9/bin/jarsigner" && "$JARSIGNER" -sigalg SHA256withRSA -digestalg SHA-256 -keystore android.keystore -signedjar capacitor-app-release-signed.aab android/app/build/outputs/bundle/release/app-release.aab android
```

Expected APK SHA-256 (upload / local keystore):

`0C:0B:DE:93:27:72:74:08:14:29:9E:35:FC:4F:6A:D1:23:1A:D2:70:2F:B0:76:22:97:22:69:49:A9:BE:E6:80`

## Install & test on a phone

1. Enable **Developer options** → **USB debugging** (or copy the APK via Drive / Nearby Share).
2. Uninstall any previous `com.trendswd.cash` build if upgrading from a different signature.
3. Install:

```bash
adb install -r capacitor-app-release-signed.apk
```

4. Open **Accounting Ledger** from the launcher.
5. Confirm:
   - Site loads at login / dashboard with the same responsive UI as mobile Chrome on `cash.trendswd.com`.
   - **No** Chrome address bar and **no** “App running in Google Chrome” strip.
   - Hardware **Back** goes to the previous in-app page; exits only at the root of history.
   - CSV / document file pickers still open; downloads still work.

## Notes

- Next.js routes under `app/` are unchanged. Capacitor only adds `android/`, `www/`, and `capacitor.config.ts`.
- Because `server.url` points at production, **deploy web changes to Vercel** to update what the APK shows — no need to rebuild the APK for most UI fixes.
- Legacy Bubblewrap/TWA files at the repo root are gitignored and should not be reintroduced; the Capacitor project lives only under `android/`.
