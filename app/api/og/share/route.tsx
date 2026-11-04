import { ImageResponse } from 'next/og'
import { kindLabel } from '@/lib/shareLinkHtml'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

/**
 * Dynamic Open Graph card for shared ledger / voucher PDF links.
 * Query: ?title=…&kind=ledger|voucher|document
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') || 'Shared document').slice(0, 90)
  const kindRaw = (searchParams.get('kind') || 'document').toLowerCase()
  const kind =
    kindRaw === 'ledger' || kindRaw === 'voucher' ? kindRaw : 'document'
  const subtitle = kindLabel(kind)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #020F11 0%, #032221 45%, #03624C 100%)',
          color: '#F1F7F6',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#00DF81',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#020F11',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            AL
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              color: '#AACBC4',
              letterSpacing: '-0.02em',
            }}
          >
            Accounting Ledger
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(0, 223, 129, 0.16)',
              color: '#00DF81',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: title.length > 48 ? 48 : 58,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#F1F7F6',
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: '#AACBC4',
              maxWidth: 860,
              lineHeight: 1.35,
            }}
          >
            Tap to open the PDF · Shared securely from your books
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#2CC295',
            fontWeight: 600,
          }}
        >
          <span>Professional ledger share</span>
          <span
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(44, 194, 149, 0.18)',
              color: '#00DF81',
            }}
          >
            PDF
          </span>
        </div>
      </div>
    ),
    { ...SIZE }
  )
}
