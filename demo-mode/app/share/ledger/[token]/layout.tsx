import type { Metadata } from 'next'
import { formatDisplayDateTime } from '@/lib/localDate'
import { fetchLedgerShareMeta } from '@/lib/ledgerShare'

type LayoutProps = {
  children: React.ReactNode
  params: { token: string }
}

/**
 * Demo metadata for share links (uses in-browser share store when available
 * via the same helpers; crawlers still get a branded card shape).
 */
export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const token = String(params?.token ?? '').trim()
  let title = 'Ledger preview'
  let business = 'Accounting Ledger'
  let description = 'Secure interactive ledger preview.'
  let expiresLabel = ''
  let expired = false

  if (token) {
    try {
      const meta = await fetchLedgerShareMeta(token)
      title = meta.accountName || title
      business = meta.businessName || business
      expired = meta.expired
      expiresLabel = formatDisplayDateTime(meta.expiresAt)
      description = expired
        ? `This ledger preview from ${business} has expired.`
        : `Account details & ledger preview from ${business}. Valid until ${expiresLabel}. Enter the access code to open.`
    } catch {
      /* keep defaults — demo store may be empty on the server */
    }
  }

  const qs = new URLSearchParams({ title, business })
  if (expiresLabel) qs.set('expires', expiresLabel)
  if (expired) qs.set('expired', '1')
  const ogImage = `/api/og/ledger-preview?${qs.toString()}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} — ledger preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function SharedLedgerLayout({ children }: LayoutProps) {
  return children
}
