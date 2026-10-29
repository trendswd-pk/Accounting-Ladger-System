'use client'

import { useCallback, useEffect, useState } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isCashSavingsAccount } from '@/lib/accountFilters'
import {
  getCachedAppSettings,
  sameIdList,
  watchAppSettings,
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
    return watchAppSettings((s) => {
      setCashTypeIds((prev) =>
        sameIdList(prev, s.cashSavingsCashTypeIds) ? prev : s.cashSavingsCashTypeIds
      )
      setAccountTypeIds((prev) =>
        sameIdList(prev, s.cashSavingsAccountTypeIds)
          ? prev
          : s.cashSavingsAccountTypeIds
      )
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
      infoText="Accounts matching any selected Account Type or Cash Type under Settings → Cash & Savings."
      emptyHint="No matching Cash & Savings accounts yet."
      returnPath="/cash-savings"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search cash and savings accounts"
    />
  )
}
