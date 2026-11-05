import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'
import LayoutContent from '@/components/LayoutContent'
import PwaRegister from '@/components/PwaRegister'
import ThemeInit from '@/components/ThemeInit'
import { siteUrl } from '@/lib/siteUrl'

/** Web stand-in for brand face Axiforma (see color-scheme rule). */
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

const description =
  'Accounting ledger system for books, journals, and financial overview.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'Accounting Ledger', template: '%s | Accounting Ledger' },
  description,
  applicationName: 'Accounting Ledger',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Accounting Ledger',
  },
  // Modern PWA meta (apple-mobile-web-app-capable is deprecated in Chromium)
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Accounting Ledger',
    title: 'Accounting Ledger',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Accounting Ledger',
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
        <PwaRegister />
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
