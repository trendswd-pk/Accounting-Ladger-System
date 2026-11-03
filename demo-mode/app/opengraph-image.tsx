import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Accounting Ledger Demo — books, journals, and financial overview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Brand link-preview card for Demo Mode. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #020F11 0%, #032221 48%, #03624C 100%)',
          color: '#F1F7F6',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#00DF81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#020F11',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            AL
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#AACBC4',
            }}
          >
            Accounting Ledger · Demo
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: '#F1F7F6',
              maxWidth: 920,
            }}
          >
            Try the ledger offline with sample books
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: '#AACBC4',
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            Full Demo Mode UI — accounts, journals, balances, and expenses with
            seeded professional data.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            color: '#2CC295',
            fontWeight: 600,
          }}
        >
          <span>No production backend · Browser sandbox</span>
          <span
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(0, 223, 129, 0.16)',
              color: '#00DF81',
            }}
          >
            Trends WD
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
