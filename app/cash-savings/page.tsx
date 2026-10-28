'use client'

import { useCallback } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isCashSavingsAccount } from '@/lib/accountFilters'

export default function CashSavingsPage() {
  const filterAccounts = useCallback(isCashSavingsAccount, [])

  return (
    <AccountBalanceListPage
      title="Cash & Savings"
      infoText="Accounts with Cash Type Cash in Hand or Savings."
      emptyHint="No Cash in Hand or Savings accounts yet."
      returnPath="/cash-savings"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search cash and savings accounts"
    />
  )
}
