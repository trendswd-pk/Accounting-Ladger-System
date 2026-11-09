'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AccountFormPage from '@/components/AccountFormPage'

function NewAccountInner() {
  const searchParams = useSearchParams()
  return <AccountFormPage returnTo={searchParams.get('from')} />
}

export default function NewAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-4 lg:p-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
        </div>
      }
    >
      <NewAccountInner />
    </Suspense>
  )
}
