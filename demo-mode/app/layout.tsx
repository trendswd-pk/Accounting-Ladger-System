import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import LayoutContent from '@/components/LayoutContent'
import ThemeInit from '@/components/ThemeInit'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: {
    default: 'Accounting Ledger (Demo)',
    template: '%s | Accounting Ledger (Demo)',
  },
  description:
    'Offline Demo Mode for Accounting Ledger — books, journals, and financial overview.',
  applicationName: 'Accounting Ledger (Demo)',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Accounting Ledger (Demo)',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0369a1',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ThemeInit />
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
