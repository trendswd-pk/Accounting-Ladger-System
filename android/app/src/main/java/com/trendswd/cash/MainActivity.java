package com.trendswd.cash;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Edge-to-edge window (targetSdk 36): WebView padding does not inset Chromium HTML.
 *
 * - Top: status-bar / cutout → WebView topMargin (brand status strip above content)
 * - Bottom: system navigation (3-button bar or gesture handle) → WebView bottomMargin
 *   so the in-app tab bar sits above Back/Home/Recents. Gesture-nav phones get a small
 *   inset; button-nav phones get the full bar height. Soft keyboard (IME) is not applied
 *   as WebView margin — it overlays as usual.
 *
 * Connection failures load the branded local {@code offline.html} (server.errorPath)
 * instead of Chromium's default "Webpage not available" screen.
 */
public class MainActivity extends BridgeActivity {
    private static final int STATUS_BAR_COLOR = Color.parseColor("#03624C");
    private static final int NAV_BAR_COLOR = Color.parseColor("#032221");
    private static final String ASSET_OFFLINE_PAGE = "file:///android_asset/public/offline.html";
    private boolean insetsListenerAttached = false;
    private boolean connectionErrorClientInstalled = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemBars();
        installConnectionErrorClient();
        getWindow().getDecorView().post(this::applySystemBars);
        getWindow().getDecorView().post(this::installConnectionErrorClient);
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
        installConnectionErrorClient();
    }

    /**
     * Replace Capacitor's default WebViewClient so main-frame load / HTTP failures
     * show our branded offline page instead of Chromium's system error UI.
     */
    private void installConnectionErrorClient() {
        if (connectionErrorClientInstalled) {
            return;
        }
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame() && !isOfflinePage(request.getUrl().toString())) {
                    // Skip super so Chromium's default "Webpage not available" UI never paints.
                    loadOfflinePage(view, bridge);
                    return;
                }
                super.onReceivedError(view, request, error);
            }

            @Override
            public void onReceivedHttpError(
                WebView view,
                WebResourceRequest request,
                WebResourceResponse errorResponse
            ) {
                if (
                    request != null
                    && request.isForMainFrame()
                    && errorResponse != null
                    && errorResponse.getStatusCode() >= 400
                    && !isOfflinePage(request.getUrl().toString())
                ) {
                    loadOfflinePage(view, bridge);
                    return;
                }
                super.onReceivedHttpError(view, request, errorResponse);
            }
        });
        connectionErrorClientInstalled = true;
    }

    private void loadOfflinePage(WebView view, Bridge bridge) {
        String errorUrl = bridge != null ? bridge.getErrorUrl() : null;
        if (errorUrl != null && !errorUrl.trim().isEmpty()) {
            view.stopLoading();
            view.loadUrl(errorUrl);
            return;
        }
        view.stopLoading();
        view.loadUrl(ASSET_OFFLINE_PAGE);
    }

    private static boolean isOfflinePage(String url) {
        if (url == null) {
            return false;
        }
        return url.contains("offline.html") || url.startsWith("file:///android_asset/");
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
            View parent = (android.view.View) webView.getParent();
            // Bottom gap (under WebView, behind system nav) uses nav bar brand color.
            parent.setBackgroundColor(NAV_BAR_COLOR);
        }

        int fallbackTop = resolveStatusBarHeightPx();
        applyWebViewSystemMargins(webView, fallbackTop, resolveNavigationBarHeightPx());

        if (!insetsListenerAttached) {
            insetsListenerAttached = true;
            ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
                Insets sys = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
                int top = sys.top > 0 ? sys.top : resolveStatusBarHeightPx();
                // 3-button nav → larger bottom; gesture handle → small; IME ignored here.
                int bottom = Math.max(0, nav.bottom);
                applyWebViewSystemMargins(webView, top, bottom);
                return insets;
            });
            ViewCompat.requestApplyInsets(webView);
        }
    }

    private void applyWebViewSystemMargins(WebView webView, int topPx, int bottomPx) {
        ViewGroup.LayoutParams raw = webView.getLayoutParams();
        if (!(raw instanceof ViewGroup.MarginLayoutParams)) {
            return;
        }
        ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) raw;
        if (lp.topMargin != topPx || lp.bottomMargin != bottomPx) {
            lp.topMargin = topPx;
            lp.bottomMargin = bottomPx;
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

    private int resolveNavigationBarHeightPx() {
        int resId = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        if (resId > 0) {
            return getResources().getDimensionPixelSize(resId);
        }
        return 0;
    }
}
