'use client'

import SetupTypeCrudPage from '@/components/SetupTypeCrudPage'

export default function AccountTypePage() {
  return (
    <SetupTypeCrudPage
      title="Account Type"
      singularLabel="Account Type"
      kind="account-types"
      emptyHint="No account types yet. Tap + to add one."
    />
  )
}
