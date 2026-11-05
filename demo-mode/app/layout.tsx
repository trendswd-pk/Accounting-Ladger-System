import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import LayoutContent from '@/components/LayoutContent'
import ThemeInit from '@/components/ThemeInit'
import { siteUrl } from '@/lib/siteUrl'

/** Web stand-in for brand face Axiforma (see color-scheme rule). */
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

const description =
  'Offline Demo Mode for Accounting Ledger — books, journals, and financial overview.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Accounting Ledger (Demo)',
    template: '%s | Accounting Ledger (Demo)',
  },
  description,
  applicationName: 'Accounting Ledger (Demo)',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Accounting Ledger (Demo)',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Accounting Ledger (Demo)',
    title: 'Accounting Ledger (Demo)',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accounting Ledger (Demo)',
    description,
  },
}

export const viewport: Viewport = {
  themeColor: '#03624C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={manrope.className} suppressHydrationWarning>
        <ThemeInit />
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
