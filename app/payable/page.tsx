'use client'

import { useCallback } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isPayableAccount } from '@/lib/accountFilters'

export default function PayablePage() {
  const filterAccounts = useCallback(isPayableAccount, [])

  return (
    <AccountBalanceListPage
      title="Payable"
      infoText="Loan accounts with a minus (negative) balance."
      emptyHint="No Payable (minus) Loan accounts yet."
      returnPath="/payable"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search payable accounts"
    />
  )
}
