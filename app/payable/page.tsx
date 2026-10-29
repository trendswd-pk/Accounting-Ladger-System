'use client'

import { useCallback, useEffect, useState } from 'react'
import AccountBalanceListPage from '@/components/AccountBalanceListPage'
import { isPayableAccount } from '@/lib/accountFilters'
import {
  fetchAppSettings,
  getCachedAppSettings,
  subscribeAppSettings,
} from '@/lib/appSettings'
import type { AccountRecord } from '@/lib/accounts'

export default function PayablePage() {
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
      isPayableAccount(account, { cashTypeIds, accountTypeIds }),
    [cashTypeIds, accountTypeIds]
  )

  return (
    <AccountBalanceListPage
      title="Payable"
      infoText="Accounts matching Settings → Payable & Receivable with a minus (negative) balance."
      emptyHint="No matching Payable accounts yet."
      returnPath="/payable"
      filterAccounts={filterAccounts}
      searchAriaLabel="Search payable accounts"
    />
  )
}
