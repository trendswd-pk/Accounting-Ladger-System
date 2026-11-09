'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import {
  inputClass,
  SettingRow,
  SettingsDetailShell,
} from '@/components/settings/SettingsShared'
import {
  defaultCashSavingsAccountTypeIds,
  defaultCashSavingsCashTypeIds,
  defaultLoanAccountTypeIds,
} from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
} from '@/lib/appSettings'
import {
  DASHBOARD_EXPENSE_PERIOD_OPTIONS,
  type DashboardExpensePeriod,
} from '@/lib/dashboardExpensePeriod'
import {
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeRecord,
} from '@/lib/setupTypes'

export default function DashboardSettingsPage() {
  const router = useRouter()
  const [cashSavingsCashTypeIds, setCashSavingsCashTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsCashTypeIds
  )
  const [cashSavingsAccountTypeIds, setCashSavingsAccountTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsAccountTypeIds
  )
  const [payableReceivableCashTypeIds, setPayableReceivableCashTypeIds] = useState<
    string[]
  >(() => DEFAULT_APP_SETTINGS.payableReceivableCashTypeIds)
  const [payableReceivableAccountTypeIds, setPayableReceivableAccountTypeIds] =
    useState<string[]>(() => DEFAULT_APP_SETTINGS.payableReceivableAccountTypeIds)
  const [dashboardExpensePeriod, setDashboardExpensePeriod] =
    useState<DashboardExpensePeriod>(DEFAULT_APP_SETTINGS.dashboardExpensePeriod)
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('cash-types') ?? []).filter((t) => t.active)
  )
  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('account-types') ?? []).filter((t) => t.active)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [settings, cashTypeRows, accountTypeRows] = await Promise.all([
          fetchAppSettings(),
          fetchSetupTypes('cash-types'),
          fetchSetupTypes('account-types'),
        ])
        if (cancelled) return
        const activeCash = cashTypeRows.filter((t) => t.active)
        const activeAccount = accountTypeRows.filter((t) => t.active)
        setCashTypes(activeCash)
        setAccountTypes(activeAccount)

        const csCash = settings.cashSavingsCashTypeIds.filter((id) =>
          activeCash.some((t) => t.id === id)
        )
        const csAccount = settings.cashSavingsAccountTypeIds.filter((id) =>
          activeAccount.some((t) => t.id === id)
        )
        const csAny = csCash.length > 0 || csAccount.length > 0
        setCashSavingsCashTypeIds(
          csAny ? csCash : defaultCashSavingsCashTypeIds(activeCash)
        )
        setCashSavingsAccountTypeIds(
          csAny ? csAccount : defaultCashSavingsAccountTypeIds(activeAccount)
        )

        const prCash = settings.payableReceivableCashTypeIds.filter((id) =>
          activeCash.some((t) => t.id === id)
        )
        const prAccount = settings.payableReceivableAccountTypeIds.filter((id) =>
          activeAccount.some((t) => t.id === id)
        )
        const prAny = prCash.length > 0 || prAccount.length > 0
        setPayableReceivableCashTypeIds(prAny ? prCash : [])
        setPayableReceivableAccountTypeIds(
          prAny ? prAccount : defaultLoanAccountTypeIds(activeAccount)
        )

        setDashboardExpensePeriod(settings.dashboardExpensePeriod)
      } catch (err) {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: err instanceof Error ? err.message : 'Failed to load settings.',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    if (cashSavingsAccountTypeIds.length === 0 && cashSavingsCashTypeIds.length === 0) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Cash & Savings.',
      })
      return
    }
    if (
      payableReceivableAccountTypeIds.length === 0 &&
      payableReceivableCashTypeIds.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Payable & Receivable.',
      })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await saveAppSettings({
        cashSavingsCashTypeIds,
        cashSavingsAccountTypeIds,
        payableReceivableCashTypeIds,
        payableReceivableAccountTypeIds,
        dashboardExpensePeriod,
      })
      router.push('/settings')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save settings.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsDetailShell
      title="Dashboard"
      info="Filters and period options that drive Dashboard cards for Cash & Savings, Payable, Receivable, and Expenses."
      saving={saving || loading}
      onSave={handleSave}
      message={message}
    >
      <div
        className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90 ${
          loading ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        <SettingRow
          label="Cash & Savings"
          description="Accounts that match any selected Account Type or Cash Type are totaled on the dashboard card and Cash & Savings page."
        >
          <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
            <MultiSelectDropdown
              id="cashSavingsAccountTypes"
              label="Account Type"
              values={cashSavingsAccountTypeIds}
              onChange={setCashSavingsAccountTypeIds}
              options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select…"
              emptyMessage="No active Account Types"
            />
            <MultiSelectDropdown
              id="cashSavingsCashTypes"
              label="Cash Type"
              values={cashSavingsCashTypeIds}
              onChange={setCashSavingsCashTypeIds}
              options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select…"
              emptyMessage="No active Cash Types"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Payable & Receivable"
          description="Matching accounts are split by balance: minus → Payable, plus → Receivable on the dashboard cards and pages."
        >
          <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
            <MultiSelectDropdown
              id="payableReceivableAccountTypes"
              label="Account Type"
              values={payableReceivableAccountTypeIds}
              onChange={setPayableReceivableAccountTypeIds}
              options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select…"
              emptyMessage="No active Account Types"
            />
            <MultiSelectDropdown
              id="payableReceivableCashTypes"
              label="Cash Type"
              values={payableReceivableCashTypeIds}
              onChange={setPayableReceivableCashTypeIds}
              options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Select…"
              emptyMessage="No active Cash Types"
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Expenses period"
          description="Calendar window for the Dashboard Expenses card. All time uses account balances; other options sum expense transactions in the current week, month, year, or last 3 / 6 months."
        >
          <div className="flex w-full justify-center sm:w-auto sm:justify-end">
            <select
              id="dashboardExpensePeriod"
              value={dashboardExpensePeriod}
              disabled={saving || loading}
              onChange={(e) =>
                setDashboardExpensePeriod(e.target.value as DashboardExpensePeriod)
              }
              aria-label="Expenses period"
              className={`${inputClass} !w-full max-w-[12rem] !min-w-0 py-1.5 sm:!w-[11rem] sm:max-w-none`}
            >
              {DASHBOARD_EXPENSE_PERIOD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </SettingRow>
      </div>
    </SettingsDetailShell>
  )
}
