'use client'

import Link from 'next/link'
import {
  BookOpen,
  Scale,
  TrendingUp,
  Wallet,
  ArrowRight,
  Settings,
} from 'lucide-react'

const statCards = [
  {
    name: 'Cash Balance',
    value: '—',
    hint: 'Coming soon',
    icon: Wallet,
  },
  {
    name: 'Receivables',
    value: '—',
    hint: 'Coming soon',
    icon: TrendingUp,
  },
  {
    name: 'Payables',
    value: '—',
    hint: 'Coming soon',
    icon: Scale,
  },
  {
    name: 'Ledger Entries',
    value: '—',
    hint: 'Coming soon',
    icon: BookOpen,
  },
]

export default function DashboardHome() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Overview of your books — balances, ledgers, and recent activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.name}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.name}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{card.hint}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Get started</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure your business profile and preferences, then start posting journal entries.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Open Settings
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  )
}
