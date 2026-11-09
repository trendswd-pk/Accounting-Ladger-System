'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BankFormPage from '@/components/BankFormPage'

function Inner() {
  const searchParams = useSearchParams()
  return <BankFormPage returnTo={searchParams.get('from')} />
}

export default function NewBankPage() {
  return (
    <Suspense fallback={<div className="p-4 lg:p-8">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
