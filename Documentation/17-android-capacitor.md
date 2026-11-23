# Android app (Capacitor WebView)

The production site [https://cash.trendswd.com/](https://cash.trendswd.com/) runs inside a **native Android WebView** via [Capacitor](https://capacitorjs.com/). This is separate from the older Bubblewrap Trusted Web Activity (TWA) experiment: there is **no Chrome Custom Tab wrapper** and no Chrome first-run / “Running in Chrome” disclosure.

| Item | Value |
|---|---|
| Package ID | `com.trendswd.cash` |
| Loads | `https://cash.trendswd.com/` (live site; UI stays the Next.js app) |
| Min SDK | 24 |
| Signing key | repo-root `android.keystore` (alias `android`) |
| Native project | `android/` (does **not** replace Next.js `app/`) |

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
- Legacy Bubblewrap/TWA files at the repo root (`twa-manifest.json`, root `gradlew`, etc.) are unrelated to this Capacitor app.
