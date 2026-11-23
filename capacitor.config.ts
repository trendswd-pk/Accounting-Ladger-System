import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor wraps the live production site in a native Android WebView.
 * UI/UX stays 100% the Next.js app at https://cash.trendswd.com/ —
 * this shell only provides the native process (no Chrome Custom Tab / TWA).
 */
const config: CapacitorConfig = {
  appId: 'com.trendswd.cash',
  appName: 'Accounting Ledger',
  webDir: 'www',
  // Load the live site so the APK always mirrors production without bundling Next.js.
  server: {
    url: 'https://cash.trendswd.com/',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F1F7F6',
    // Hardware back: handled in MainActivity (WebView history, then exit).
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: '#F1F7F6',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      // Overlay; MainActivity pads the WebView with real status-bar/cutout insets
      // (Android WebView often reports CSS safe-area as 0).
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#03624C',
    },
  },
}

export default config
