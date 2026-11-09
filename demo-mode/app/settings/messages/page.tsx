'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionBtnClass,
  inputClass,
  SettingRow,
  SettingsDetailShell,
} from '@/components/settings/SettingsShared'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
} from '@/lib/appSettings'
import { LEDGER_SHARE_TTL_OPTIONS } from '@/lib/ledgerShareCrypto'

export default function MessagesSettingsPage() {
  const router = useRouter()
  const [accountMessageTemplate, setAccountMessageTemplate] = useState(
    DEFAULT_APP_SETTINGS.accountMessageTemplate
  )
  const [transactionMessageTemplate, setTransactionMessageTemplate] = useState(
    DEFAULT_APP_SETTINGS.transactionMessageTemplate
  )
  const [messageNotePlus, setMessageNotePlus] = useState(
    DEFAULT_APP_SETTINGS.messageNotePlus
  )
  const [messageNoteMinus, setMessageNoteMinus] = useState(
    DEFAULT_APP_SETTINGS.messageNoteMinus
  )
  const [messageNoteZero, setMessageNoteZero] = useState(
    DEFAULT_APP_SETTINGS.messageNoteZero
  )
  const [accountMessageIncludeLedgerUrl, setAccountMessageIncludeLedgerUrl] = useState(
    DEFAULT_APP_SETTINGS.accountMessageIncludeLedgerUrl
  )
  const [transactionMessageIncludeLedgerUrl, setTransactionMessageIncludeLedgerUrl] =
    useState(DEFAULT_APP_SETTINGS.transactionMessageIncludeLedgerUrl)
  const [ledgerShareRequirePin, setLedgerShareRequirePin] = useState(
    DEFAULT_APP_SETTINGS.ledgerShareRequirePin
  )
  const [ledgerShareTtlHours, setLedgerShareTtlHours] = useState(
    DEFAULT_APP_SETTINGS.ledgerShareTtlHours
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
        const s = await fetchAppSettings()
        if (cancelled) return
        setAccountMessageTemplate(s.accountMessageTemplate)
        setTransactionMessageTemplate(s.transactionMessageTemplate)
        setMessageNotePlus(s.messageNotePlus)
        setMessageNoteMinus(s.messageNoteMinus)
        setMessageNoteZero(s.messageNoteZero)
        setAccountMessageIncludeLedgerUrl(s.accountMessageIncludeLedgerUrl)
        setTransactionMessageIncludeLedgerUrl(s.transactionMessageIncludeLedgerUrl)
        setLedgerShareRequirePin(s.ledgerShareRequirePin)
        setLedgerShareTtlHours(s.ledgerShareTtlHours)
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
    setSaving(true)
    setMessage(null)
    try {
      await saveAppSettings({ ledgerShareRequirePin, ledgerShareTtlHours })
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
      title="Messages"
      info="WhatsApp templates and ledger preview link options (PIN and expiry)."
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
          label="Send messages"
          description="Templates for WhatsApp send on Accounts and Transactions. Use {{variables}} for name, balance, amount, and more."
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              className={actionBtnClass}
              disabled={loading}
              onClick={() => router.push('/settings/messages/account-template')}
            >
              {accountMessageTemplate.trim() ? 'Edit account' : 'Account message'}
            </button>
            <button
              type="button"
              className={actionBtnClass}
              disabled={loading}
              onClick={() => router.push('/settings/messages/transaction-template')}
            >
              {transactionMessageTemplate.trim()
                ? 'Edit transaction'
                : 'Transaction message'}
            </button>
          </div>
        </SettingRow>

        <SettingRow
          label="Ledger preview link"
          description="PIN and expiry for new WhatsApp ledger preview links. Existing links keep the settings they were created with."
          inline
        >
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">PIN</span>
              <button
                type="button"
                role="switch"
                aria-checked={ledgerShareRequirePin}
                aria-label={
                  ledgerShareRequirePin ? 'PIN required enabled' : 'PIN required disabled'
                }
                disabled={saving || loading}
                onClick={() => setLedgerShareRequirePin((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 ${
                  ledgerShareRequirePin
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    ledgerShareRequirePin ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div
              className="hidden h-5 w-px bg-gray-200 dark:bg-gray-600 sm:block"
              aria-hidden
            />
            <label className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-gray-600 dark:text-gray-300">
                Expires
              </span>
              <select
                value={ledgerShareTtlHours}
                disabled={saving || loading}
                onChange={(e) => setLedgerShareTtlHours(Number(e.target.value))}
                className={`${inputClass} !w-[7.75rem] !min-w-0 shrink-0 py-1.5 sm:!w-[7.75rem]`}
              >
                {LEDGER_SHARE_TTL_OPTIONS.map((opt) => (
                  <option key={opt.hours} value={opt.hours}>
                    {opt.label}
                  </option>
                ))}
                {!LEDGER_SHARE_TTL_OPTIONS.some(
                  (o) => o.hours === ledgerShareTtlHours
                ) ? (
                  <option value={ledgerShareTtlHours}>
                    {ledgerShareTtlHours} hours
                  </option>
                ) : null}
              </select>
            </label>
          </div>
        </SettingRow>
      </div>
    </SettingsDetailShell>
  )
}
