'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import TransactionEditFormPage from '@/components/TransactionEditFormPage'

function Inner() {
  const params = useParams()
  const searchParams = useSearchParams()
  return (
    <TransactionEditFormPage
      transactionId={String(params?.id ?? '').trim()}
      returnTo={searchParams.get('from')}
    />
  )
}

export default function EditTransactionPage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
