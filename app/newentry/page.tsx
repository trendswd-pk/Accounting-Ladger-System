'use client'

import { useRouter } from 'next/navigation'
import TransactionFormModal from '@/components/TransactionFormModal'

/**
 * Dedicated URL for adding a transaction (replaces the add popup flow).
 * Cancel / save → Transactions list.
 * Save already updates the in-memory transactions cache — do not invalidate
 * (that forced a full list refetch and a slow reload spinner).
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
        onSaved={leave}
      />
    </div>
  )
}
