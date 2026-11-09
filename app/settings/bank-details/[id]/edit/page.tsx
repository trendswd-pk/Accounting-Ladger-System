'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import BankFormPage from '@/components/BankFormPage'

function Inner() {
  const params = useParams()
  const searchParams = useSearchParams()
  return (
    <BankFormPage
      bankId={String(params?.id ?? '').trim()}
      returnTo={searchParams.get('from')}
    />
  )
}

export default function EditBankPage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
