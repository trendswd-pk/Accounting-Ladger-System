'use client'

import { useCallback, useEffect, useState } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isReceivableAccount } from '@/lib/accountFilters'
import {
  fetchAppSettings,
  getCachedAppSettings,
  subscribeAppSettings,
} from '@/lib/appSettings'
import type { AccountRecord } from '@/lib/accounts'

export default function ReceivablePage() {
  const [cashTypeIds, setCashTypeIds] = useState<string[]>(
    () => getCachedAppSettings()?.payableReceivableCashTypeIds ?? []
  )
  const [accountTypeIds, setAccountTypeIds] = useState<string[]>(
    () => getCachedAppSettings()?.payableReceivableAccountTypeIds ?? []
  )

  useEffect(() => {
    void fetchAppSettings()
      .then((s) => {
        setCashTypeIds(s.payableReceivableCashTypeIds)
        setAccountTypeIds(s.payableReceivableAccountTypeIds)
      })
      .catch(() => {})
    return subscribeAppSettings((s) => {
      setCashTypeIds(s.payableReceivableCashTypeIds)
      setAccountTypeIds(s.payableReceivableAccountTypeIds)
    })
  }, [])

  const filterAccounts = useCallback(
    (account: AccountRecord) =>
      isReceivableAccount(account, { cashTypeIds, accountTypeIds }),
    [cashTypeIds, accountTypeIds]
  )

  return (
    <AccountBalanceListPage
      title="Receivable"
      infoText="Accounts matching Settings → Payable & Receivable with a plus (positive) balance."
      emptyHint="No matching Receivable accounts yet."
      returnPath="/receivable"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search receivable accounts"
    />
  )
}
