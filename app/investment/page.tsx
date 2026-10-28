'use client'

import { useCallback } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isInvestAccount } from '@/lib/accountFilters'

export default function InvestmentPage() {
  const filterAccounts = useCallback(isInvestAccount, [])

  return (
    <AccountBalanceListPage
      title="Investment"
      infoText="Accounts with Account Type Invest or Investment."
      emptyHint="No Investment accounts yet."
      returnPath="/investment"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search investment accounts"
    />
  )
}
