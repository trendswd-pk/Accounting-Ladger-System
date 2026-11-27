package com.trendswd.cash;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * Keeps the live site below the system status bar on Android 15+ (targetSdk 36),
 * where edge-to-edge is the default and WebView.setPadding does not inset HTML.
 *
 * Approach: leave the window edge-to-edge, paint the status-bar strip brand green,
 * and push the WebView down with topMargin equal to the real status-bar inset.
 */
public class MainActivity extends BridgeActivity {
    private static final int STATUS_BAR_COLOR = Color.parseColor("#03624C");
    private static final int NAV_BAR_COLOR = Color.parseColor("#032221");
    private boolean insetsListenerAttached = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
        getWindow().getDecorView().post(this::applySystemBars);
        getWindow().getDecorView().postDelayed(this::applySystemBars, 300);
        getWindow().getDecorView().postDelayed(this::applySystemBars, 1000);

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

    @Override
    public void onResume() {
        super.onResume();
        applySystemBars();
    }

    private void applySystemBars() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(STATUS_BAR_COLOR);
        window.setNavigationBarColor(NAV_BAR_COLOR);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        WebView webView = bridge.getWebView();
        if (webView == null) {
            return;
        }

        webView.setBackgroundColor(STATUS_BAR_COLOR);
        // Padding does not move Chromium layout — clear any old padding from prior builds.
        webView.setPadding(0, 0, 0, 0);
        // Let Android Password Manager / Autofill Framework target login fields in the WebView.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }

        if (webView.getParent() instanceof android.view.View) {
            ((android.view.View) webView.getParent()).setBackgroundColor(STATUS_BAR_COLOR);
        }

        int fallbackTop = resolveStatusBarHeightPx();
        applyWebViewTopMargin(webView, fallbackTop);

        if (!insetsListenerAttached) {
            insetsListenerAttached = true;
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
                Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                );
                int top = bars.top > 0 ? bars.top : resolveStatusBarHeightPx();
                applyWebViewTopMargin(webView, top);
                // Keep IME / nav insets flowing; top is handled via WebView margin.
                return insets;
            });
            ViewCompat.requestApplyInsets(webView);
        }
    }

    private void applyWebViewTopMargin(WebView webView, int topPx) {
        ViewGroup.LayoutParams raw = webView.getLayoutParams();
        if (!(raw instanceof ViewGroup.MarginLayoutParams)) {
            return;
        }
        ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) raw;
        if (lp.topMargin != topPx) {
            lp.topMargin = topPx;
            // Keep bottom flush — tab bar already handles home-indicator inset in CSS.
            lp.bottomMargin = 0;
            webView.setLayoutParams(lp);
        }
    }

    private int resolveStatusBarHeightPx() {
        int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            return getResources().getDimensionPixelSize(resId);
        }
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        return Math.round(28 * metrics.density);
    }
}
