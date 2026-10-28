'use client'

import { useCallback } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isReceivableAccount } from '@/lib/accountFilters'

export default function ReceivablePage() {
  const filterAccounts = useCallback(isReceivableAccount, [])

  return (
    <AccountBalanceListPage
      title="Receivable"
      infoText="Loan accounts with a plus (positive) balance."
      emptyHint="No Receivable (plus) Loan accounts yet."
      returnPath="/receivable"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search receivable accounts"
    />
  )
}
