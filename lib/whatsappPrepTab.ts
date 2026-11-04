/**
 * Opens a same-gesture browser tab with a branded progress UI while PDFs /
 * message text are prepared, then navigates that tab to WhatsApp.
 * Avoids a blank white tab and keeps popup blockers happy.
 */

export type WhatsAppPrepHandle = {
  win: Window
  setProgress: (percent: number, label?: string) => void
  goToUrl: (url: string) => void
  close: () => void
}

const PREP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preparing WhatsApp…</title>
  <style>
    :root {
      --ink: #020F11;
      --pine: #06302B;
      --cta: #03624C;
      --accent: #00DF81;
      --mint: #E3F5EF;
      --stone: #707D7D;
      --canvas: #F1F7F6;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      height: 100%;
      font-family: Manrope, system-ui, -apple-system, Segoe UI, sans-serif;
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0, 223, 129, 0.18), transparent),
        var(--canvas);
      color: var(--ink);
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: min(100%, 360px);
      background: #fff;
      border: 1px solid #AACBC4;
      border-radius: 20px;
      padding: 28px 24px 24px;
      box-shadow: 0 12px 40px rgba(2, 15, 17, 0.08);
      text-align: center;
    }
    .spin {
      width: 44px;
      height: 44px;
      margin: 0 auto 16px;
      border-radius: 50%;
      border: 3px solid var(--mint);
      border-top-color: var(--cta);
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 {
      margin: 0 0 6px;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    #label {
      margin: 0 0 20px;
      font-size: 0.875rem;
      color: var(--stone);
      min-height: 1.25em;
    }
    .track {
      height: 8px;
      border-radius: 999px;
      background: var(--mint);
      overflow: hidden;
    }
    #bar {
      height: 100%;
      width: 0%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--cta), var(--accent));
      transition: width 0.35s ease;
    }
    #pct {
      margin: 12px 0 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--cta);
      font-variant-numeric: tabular-nums;
    }
    .hint {
      margin: 14px 0 0;
      font-size: 0.75rem;
      color: var(--stone);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spin" aria-hidden="true"></div>
    <h1>Opening WhatsApp</h1>
    <p id="label">Preparing message…</p>
    <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="track">
      <div id="bar"></div>
    </div>
    <p id="pct">0%</p>
    <p class="hint">This tab will open WhatsApp when ready.</p>
  </div>
  <script>
    window.__setPrep = function (percent, label) {
      var p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
      var bar = document.getElementById('bar');
      var pct = document.getElementById('pct');
      var lab = document.getElementById('label');
      var track = document.getElementById('track');
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
      if (track) track.setAttribute('aria-valuenow', String(p));
      if (lab && label) lab.textContent = label;
    };
  </script>
</body>
</html>`

function writePrepDocument(win: Window, label: string): void {
  try {
    win.document.open()
    win.document.write(PREP_HTML)
    win.document.close()
    const setPrep = (
      win as Window & { __setPrep?: (p: number, l?: string) => void }
    ).__setPrep
    if (typeof setPrep === 'function') setPrep(4, label)
  } catch {
    // Cross-origin / closed — ignore; WhatsApp navigate may still work later.
  }
}

/**
 * Must be called synchronously inside a click/tap handler (popup gesture).
 */
export function openWhatsAppPrepTab(
  initialLabel = 'Preparing message…'
): WhatsAppPrepHandle | null {
  if (typeof window === 'undefined') return null
  const win = window.open('about:blank', '_blank')
  if (!win) return null

  writePrepDocument(win, initialLabel)

  const setProgress = (percent: number, label?: string) => {
    if (win.closed) return
    const p = Math.max(0, Math.min(100, Math.round(percent)))
    try {
      const setPrep = (
        win as Window & { __setPrep?: (n: number, l?: string) => void }
      ).__setPrep
      if (typeof setPrep === 'function') {
        setPrep(p, label)
        return
      }
      const doc = win.document
      const bar = doc.getElementById('bar')
      const pct = doc.getElementById('pct')
      const lab = doc.getElementById('label')
      const track = doc.getElementById('track')
      if (bar) bar.style.width = `${p}%`
      if (pct) pct.textContent = `${p}%`
      if (track) track.setAttribute('aria-valuenow', String(p))
      if (lab && label) lab.textContent = label
    } catch {
      /* ignore */
    }
  }

  const goToUrl = (url: string) => {
    if (win.closed) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    setProgress(100, 'Opening WhatsApp…')
    // Brief beat so 100% is visible, then navigate.
    window.setTimeout(() => {
      try {
        if (!win.closed) win.location.href = url
      } catch {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }, 220)
  }

  const close = () => {
    try {
      if (!win.closed) win.close()
    } catch {
      /* ignore */
    }
  }

  return { win, setProgress, goToUrl, close }
}
