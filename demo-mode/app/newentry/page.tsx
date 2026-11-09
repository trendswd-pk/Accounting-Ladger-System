'use client'

import { useRouter } from 'next/navigation'
import TransactionFormModal from '@/components/TransactionFormModal'
import { invalidateTransactionsCache } from '@/lib/transactions'

/**
 * Dedicated URL for adding a transaction (replaces the add popup flow).
 * Cancel / save → Transactions list.
 */
export default function NewEntryPage() {
  const router = useRouter()

  const leave = () => {
    router.push('/transactions')
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <TransactionFormModal
        open
        presentation="page"
        onClose={leave}
        onSaved={() => {
          invalidateTransactionsCache()
          leave()
        }}
      />
    </div>
  )
}
