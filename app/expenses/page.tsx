'use client'

import { useCallback } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isExpenseAccount } from '@/lib/accountFilters'

export default function ExpensesPage() {
  const filterAccounts = useCallback(isExpenseAccount, [])

  return (
    <AccountBalanceListPage
      title="Expenses"
      infoText="Accounts with Account Type Expense or Expenses."
      emptyHint="No Expense accounts yet."
      returnPath="/expenses"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search expense accounts"
    />
  )
}
