import { siteUrl } from '@/lib/siteUrl'

export type ShareLinkKind = 'ledger' | 'voucher' | 'document'

export type ShareLinkPreviewInput = {
  /** Absolute canonical URL of this share page (og:url). */
  pageUrl: string
  /** Absolute URL of the PDF / file to open. */
  fileUrl: string
  /** Display title (usually file name without extension). */
  title: string
  /** Short description for OG + page. */
  description?: string
  /** ledger | voucher | document */
  kind?: ShareLinkKind
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Human title from a stored file name. */
export function titleFromFileName(fileName: string): string {
  const base = String(fileName ?? '')
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base || 'Shared document'
}

/** Infer kind from folder path / file name for OG card copy. */
export function kindFromFolder(folder: string, fileName: string): ShareLinkKind {
  const f = `${folder} ${fileName}`.toLowerCase()
  if (f.includes('ledger')) return 'ledger'
  if (f.includes('transaction') || f.includes('voucher')) return 'voucher'
  return 'document'
}

export function kindLabel(kind: ShareLinkKind | undefined): string {
  if (kind === 'ledger') return 'Account ledger PDF'
  if (kind === 'voucher') return 'Transaction voucher PDF'
  return 'Shared PDF document'
}

/**
 * Branded HTML landing page with Open Graph / Twitter tags so WhatsApp
 * and other messengers show a professional link preview. Humans get a
 * button + JS redirect (crawlers typically do not run JS).
 */
export function buildShareLinkHtml(input: ShareLinkPreviewInput): string {
  const title = (input.title || 'Shared document').slice(0, 120)
  const kind = input.kind ?? 'document'
  const description = (
    input.description ||
    `${kindLabel(kind)} from Accounting Ledger. Open to view the PDF.`
  ).slice(0, 200)

  const pageUrl = input.pageUrl
  const fileUrl = input.fileUrl
  let origin = siteUrl()
  try {
    origin = new URL(pageUrl).origin
  } catch {
    /* keep siteUrl */
  }
  const ogImage = `${origin}/api/og/share?title=${encodeURIComponent(title)}&kind=${encodeURIComponent(kind)}`

  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safePage = escapeHtml(pageUrl)
  const safeFile = escapeHtml(fileUrl)
  const safeOg = escapeHtml(ogImage)
  const badge = escapeHtml(kindLabel(kind))

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} · Accounting Ledger</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safePage}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Accounting Ledger" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${safePage}" />
  <meta property="og:image" content="${safeOg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeOg}" />

  <style>
    :root {
      --ink: #020F11;
      --cta: #03624C;
      --cta-hover: #095544;
      --accent: #00DF81;
      --mint: #E3F5EF;
      --pistachio: #AACBC4;
      --stone: #707D7D;
      --canvas: #F1F7F6;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      font-family: Manrope, system-ui, -apple-system, Segoe UI, sans-serif;
      background:
        radial-gradient(ellipse 90% 55% at 50% -15%, rgba(0, 223, 129, 0.2), transparent),
        var(--canvas);
      color: var(--ink);
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px 20px;
    }
    .card {
      width: min(100%, 420px);
      background: #fff;
      border: 1px solid var(--pistachio);
      border-radius: 20px;
      padding: 28px 24px 24px;
      box-shadow: 0 16px 48px rgba(2, 15, 17, 0.1);
      text-align: center;
    }
    .badge {
      display: inline-block;
      margin-bottom: 14px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--mint);
      color: var(--cta);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.25;
      word-break: break-word;
    }
    p {
      margin: 0 0 22px;
      font-size: 0.9rem;
      color: var(--stone);
      line-height: 1.45;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 48px;
      padding: 12px 18px;
      border-radius: 12px;
      border: none;
      background: var(--cta);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .btn:hover { background: var(--cta-hover); }
    .hint {
      margin: 14px 0 0;
      font-size: 0.75rem;
      color: var(--stone);
    }
    .brand {
      margin-top: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--pistachio);
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${badge}</div>
    <h1>${safeTitle}</h1>
    <p>${safeDesc}</p>
    <a class="btn" id="open" href="${safeFile}" rel="noopener noreferrer">Open document</a>
    <p class="hint">Opening automatically…</p>
    <div class="brand">Accounting Ledger</div>
  </main>
  <script>
    (function () {
      var href = ${JSON.stringify(fileUrl)};
      if (!href) return;
      setTimeout(function () {
        try { window.location.replace(href); } catch (e) {}
      }, 900);
    })();
  </script>
</body>
</html>`
}

export function shareLinkHtmlResponse(input: ShareLinkPreviewInput): Response {
  return new Response(buildShareLinkHtml(input), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  })
}
