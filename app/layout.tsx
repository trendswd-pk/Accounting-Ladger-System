import type { Metadata } from 'next'
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
  title: { default: 'Accounting Ledger', template: '%s | Accounting Ledger' },
  description: 'Accounting ledger system for books, journals, and financial overview.',
  applicationName: 'Accounting Ledger',
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
