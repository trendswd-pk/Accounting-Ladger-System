import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 }

/**
 * Open Graph card for PIN-gated /share/ledger/{token} links.
 * Mirrors the unlocked home: brand header + account details panel (no private balance/phone).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = (searchParams.get('title') || 'Account ledger').slice(0, 80)
  const business = (searchParams.get('business') || 'Accounting Ledger').slice(
    0,
    60
  )
  const expires = (searchParams.get('expires') || '').slice(0, 48)
  const expired = searchParams.get('expired') === '1'

  const titleSize = title.length > 36 ? 42 : title.length > 24 ? 48 : 54

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 40,
          background: '#F1F7F6',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            padding: '28px 36px',
            borderRadius: '18px 18px 0 0',
            background: '#03624C',
            color: '#F1F7F6',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#AACBC4',
                letterSpacing: '-0.01em',
              }}
            >
              {business}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'rgba(241, 247, 246, 0.75)',
              }}
            >
              Ledger preview
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
              maxWidth: '52%',
            }}
          >
            <div
              style={{
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#F87171',
                textAlign: 'right',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: '#C8EBDF',
                textAlign: 'right',
              }}
            >
              {expired
                ? 'Link expired'
                : expires
                  ? `Valid until ${expires}`
                  : 'Access code required'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            gap: 22,
            padding: '32px 36px 28px',
            borderRadius: '0 0 18px 18px',
            background: '#FFFFFF',
            border: '1px solid #AACBC4',
            borderTop: 'none',
            boxShadow: '0 12px 40px rgba(2, 15, 17, 0.08)',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#707D7D',
            }}
          >
            Account details
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <Row label="Name" value={title} strong />
            <Row label="Document" value="Interactive ledger preview" />
            <Row
              label="Access"
              value={
                expired
                  ? 'Expired — request a new link'
                  : '4-digit code required to unlock'
              }
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 'auto',
              flexWrap: 'wrap',
            }}
          >
            <Chip>Full ledger</Chip>
            <Chip>Current month</Chip>
            <Chip>Export</Chip>
            <Chip accent>Bank details</Chip>
          </div>
        </div>
      </div>
    ),
    { ...SIZE }
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 500, color: '#707D7D' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: strong ? 700 : 600,
          color: '#020F11',
          textAlign: 'right',
          maxWidth: 720,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Chip({
  children,
  accent,
}: {
  children: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 18px',
        borderRadius: 14,
        fontSize: 20,
        fontWeight: 600,
        background: accent ? '#E3F5EF' : '#F1F7F6',
        color: accent ? '#03624C' : '#032221',
        border: accent ? '1px solid #C8EBDF' : '1px solid #AACBC4',
      }}
    >
      {children}
    </div>
  )
}
