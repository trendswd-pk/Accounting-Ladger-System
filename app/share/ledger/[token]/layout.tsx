import type { Metadata } from 'next'
import { getLedgerShareMeta } from '@/lib/ledgerShareServer'
import { formatDisplayDateTime } from '@/lib/localDate'

type LayoutProps = {
  children: React.ReactNode
  params: { token: string }
}

/**
 * Server metadata so WhatsApp / messengers show a branded link card
 * (account name + validity) instead of the generic app OG defaults.
 */
export async function generateMetadata({
  params,
}: {
  params: { token: string }
}): Promise<Metadata> {
  const token = String(params?.token ?? '').trim()
  const meta = token ? await getLedgerShareMeta(token) : null

  if (!meta) {
    return {
      title: 'Ledger preview',
      description: 'Secure interactive ledger preview.',
      openGraph: {
        title: 'Ledger preview',
        description: 'Secure interactive ledger preview.',
      },
    }
  }

  const title = meta.accountName || 'Account ledger'
  const expiresLabel = formatDisplayDateTime(meta.expiresAt)
  const description = meta.expired
    ? `This ledger preview from ${meta.businessName} has expired.`
    : `Account details & ledger preview from ${meta.businessName}. Valid until ${expiresLabel}. Enter the access code to open.`

  const qs = new URLSearchParams({
    title,
    business: meta.businessName,
    expires: expiresLabel,
  })
  if (meta.expired) qs.set('expired', '1')
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
