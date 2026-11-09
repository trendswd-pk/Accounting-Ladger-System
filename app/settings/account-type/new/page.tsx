'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SetupTypeFormPage from '@/components/SetupTypeFormPage'

function Inner() {
  const searchParams = useSearchParams()
  return (
    <SetupTypeFormPage
      kind="account-types"
      singularLabel="Account Type"
      listPath="/settings/account-type"
      returnTo={searchParams.get('from')}
    />
  )
}

export default function NewAccountTypePage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
