'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import AccountFormPage from '@/components/AccountFormPage'

function EditAccountInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const accountId = String(params?.id ?? '').trim()
  return (
    <AccountFormPage
      accountId={accountId}
      returnTo={searchParams.get('from')}
    />
  )
}

export default function EditAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-4 lg:p-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        </div>
      }
    >
      <EditAccountInner />
    </Suspense>
  )
}
