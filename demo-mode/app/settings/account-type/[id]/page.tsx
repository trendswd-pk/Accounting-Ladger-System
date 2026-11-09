'use client'

import SetupTypeAccountsPage from '@/components/SetupTypeAccountsPage'

export default function AccountTypeAccountsPage() {
  return (
    <SetupTypeAccountsPage
      kind="account-types"
      listPath="/settings/account-type"
      singularLabel="Account Type"
    />
  )
}
