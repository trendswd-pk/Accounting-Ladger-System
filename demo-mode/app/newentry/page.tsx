'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TransactionFormModal from '@/components/TransactionFormModal'

/** Same-origin relative path only — blocks open redirects. */
function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null
  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  path = path.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null
  if (path === '/newentry' || path.startsWith('/newentry?')) return null
  return path
}

/**
 * Dedicated URL for adding a transaction (replaces the add popup flow).
 * Cancel / save → `from` query (page that opened the form), else Transactions.
 * Save already updates the in-memory transactions cache — do not invalidate.
 */
function NewEntryPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leaveTo = safeReturnPath(searchParams.get('from')) ?? '/transactions'

  const leave = () => {
    router.push(leaveTo)
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <TransactionFormModal
        open
        presentation="page"
        onClose={leave}
        onSaved={leave}
      />
    </div>
  )
}

export default function NewEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-4 text-sm text-gray-500 lg:p-8 dark:text-gray-400">
          Loading…
        </div>
      }
    >
      <NewEntryPageInner />
    </Suspense>
  )
}
