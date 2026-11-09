'use client'

import SetupTypeAccountsPage from '@/components/SetupTypeAccountsPage'

export default function CashTypeAccountsPage() {
  return (
    <SetupTypeAccountsPage
      kind="cash-types"
      listPath="/settings/cash-type"
      singularLabel="Cash Type"
    />
  )
}
