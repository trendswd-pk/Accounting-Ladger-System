'use client'

import SetupTypeCrudPage from '@/components/SetupTypeCrudPage'

export default function AccountTypePage() {
  return (
    <SetupTypeCrudPage
      title="Account Type"
      singularLabel="Account Type"
      kind="account-types"
      listPath="/settings/account-type"
      emptyHint="No account types yet. Tap + to add one."
    />
  )
}
