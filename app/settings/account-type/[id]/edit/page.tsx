'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import SetupTypeFormPage from '@/components/SetupTypeFormPage'

function Inner() {
  const params = useParams()
  const searchParams = useSearchParams()
  return (
    <SetupTypeFormPage
      kind="account-types"
      singularLabel="Account Type"
      listPath="/settings/account-type"
      typeId={String(params?.id ?? '').trim()}
      returnTo={searchParams.get('from')}
    />
  )
}

export default function EditAccountTypePage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
