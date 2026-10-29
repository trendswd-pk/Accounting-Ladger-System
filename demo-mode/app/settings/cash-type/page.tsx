'use client'

import SetupTypeCrudPage from '@/components/SetupTypeCrudPage'

export default function CashTypePage() {
  return (
    <SetupTypeCrudPage
      title="Cash Type"
      singularLabel="Cash Type"
      kind="cash-types"
      emptyHint="No cash types yet. Tap + to add one."
    />
  )
}
