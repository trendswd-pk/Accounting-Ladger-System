package com.trendswd.cash;

import android.graphics.Color;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * Forces the WebView content below the status bar.
 * Does not rely on CSS env(safe-area-inset-top) (often 0 in Android WebView)
 * or WindowInsets listeners (unreliable on some OEMs with Capacitor).
 */
public class MainActivity extends BridgeActivity {
    private static final int STATUS_BAR_COLOR = Color.parseColor("#03624C");
    private static final int NAV_BAR_COLOR = Color.parseColor("#032221");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyTopInset();
        getWindow().getDecorView().post(this::applyTopInset);
        getWindow().getDecorView().postDelayed(this::applyTopInset, 250);
        getWindow().getDecorView().postDelayed(this::applyTopInset, 800);
        getWindow().getDecorView().postDelayed(this::applyTopInset, 2000);

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
        applyTopInset();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyTopInset();
        }
    }

    private void applyTopInset() {
        Window window = getWindow();
        // Full-bleed window; we reserve top space ourselves with WebView padding.
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
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

        int top = resolveStatusBarHeightPx();

        // Green strip under the clock / signal icons; page content starts below.
        // Do not pad bottom — mobile tab bar already uses safe-area-inset-bottom.
        webView.setBackgroundColor(STATUS_BAR_COLOR);
        webView.setPadding(0, top, 0, 0);

        // Help fixed CSS chrome (sidebar) after the live site picks up safe-area classes.
        float density = getResources().getDisplayMetrics().density;
        int cssTop = Math.max(0, Math.round(top / density));
        String js =
            "(function(){var r=document.documentElement;if(!r)return;"
                + "r.style.setProperty('--safe-area-top','"
                + cssTop
                + "px');})();";
        webView.evaluateJavascript(js, null);
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
