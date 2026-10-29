'use client'

import { useCallback, useEffect, useState } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isCashSavingsAccount } from '@/lib/accountFilters'
import {
  fetchAppSettings,
  getCachedAppSettings,
  subscribeAppSettings,
} from '@/lib/appSettings'
import type { AccountRecord } from '@/lib/accounts'

export default function CashSavingsPage() {
  const [cashTypeIds, setCashTypeIds] = useState<string[]>(
    () => getCachedAppSettings()?.cashSavingsCashTypeIds ?? []
  )
  const [accountTypeIds, setAccountTypeIds] = useState<string[]>(
    () => getCachedAppSettings()?.cashSavingsAccountTypeIds ?? []
  )

  useEffect(() => {
    void fetchAppSettings()
      .then((s) => {
        setCashTypeIds(s.cashSavingsCashTypeIds)
        setAccountTypeIds(s.cashSavingsAccountTypeIds)
      })
      .catch(() => {})
    return subscribeAppSettings((s) => {
      setCashTypeIds(s.cashSavingsCashTypeIds)
      setAccountTypeIds(s.cashSavingsAccountTypeIds)
    })
  }, [])

  const filterAccounts = useCallback(
    (account: AccountRecord) =>
      isCashSavingsAccount(account, {
        cashTypeIds,
        accountTypeIds,
      }),
    [cashTypeIds, accountTypeIds]
  )

  return (
    <AccountBalanceListPage
      title="Cash & Savings"
      infoText="Accounts matching Account Type and Cash Type filters under Settings → Cash & Savings."
      emptyHint="No matching Cash & Savings accounts yet."
      returnPath="/cash-savings"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search cash and savings accounts"
    />
  )
}
