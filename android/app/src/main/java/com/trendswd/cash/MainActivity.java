package com.trendswd.cash;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * Native WebView host for https://cash.trendswd.com/
 * Hardware back walks WebView history; exits only when there is nowhere to go.
 * Status bar does not overlay web content (clock/icons stay above the app header).
 */
public class MainActivity extends BridgeActivity {
    private static final int STATUS_BAR_COLOR = Color.parseColor("#03624C");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        // Keep system bars outside the WebView so CSS safe-area is a backup, not the only fix.
        WindowCompat.setDecorFitsSystemWindows(window, true);
        window.setStatusBarColor(STATUS_BAR_COLOR);
        window.setNavigationBarColor(Color.parseColor("#032221"));

        WindowInsetsControllerCompat insets =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insets != null) {
            // Light icons on brand-green status bar.
            insets.setAppearanceLightStatusBars(false);
            insets.setAppearanceLightNavigationBars(false);
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge bridge = getBridge();
                WebView webView = bridge != null ? bridge.getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
