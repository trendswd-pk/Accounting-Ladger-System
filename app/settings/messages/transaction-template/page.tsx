'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageTemplateModal } from '@/components/settings/SettingsShared'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
} from '@/lib/appSettings'
import { TRANSACTION_MESSAGE_VARS } from '@/lib/messageTemplates'

export default function TransactionMessageTemplatePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [template, setTemplate] = useState(
    DEFAULT_APP_SETTINGS.transactionMessageTemplate
  )
  const [notePlus, setNotePlus] = useState(DEFAULT_APP_SETTINGS.messageNotePlus)
  const [noteMinus, setNoteMinus] = useState(DEFAULT_APP_SETTINGS.messageNoteMinus)
  const [noteZero, setNoteZero] = useState(DEFAULT_APP_SETTINGS.messageNoteZero)
  const [includeLedgerUrl, setIncludeLedgerUrl] = useState(
    DEFAULT_APP_SETTINGS.transactionMessageIncludeLedgerUrl
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const s = await fetchAppSettings()
        if (cancelled) return
        setTemplate(s.transactionMessageTemplate)
        setNotePlus(s.messageNotePlus)
        setNoteMinus(s.messageNoteMinus)
        setNoteZero(s.messageNoteZero)
        setIncludeLedgerUrl(s.transactionMessageIncludeLedgerUrl)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load settings.')
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const leave = () => router.push('/settings/messages')

  if (!ready) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-6 h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="w-full p-4 lg:p-8">
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {loadError}
        </p>
        <button
          type="button"
          onClick={leave}
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <MessageTemplateModal
      open
      presentation="page"
      title="Transaction message"
      description="Used when sending from the Transactions page. Click a variable to insert it at the cursor."
      value={template}
      notes={{ plus: notePlus, minus: noteMinus, zero: noteZero }}
      variables={TRANSACTION_MESSAGE_VARS}
      shareUrlOptions={[
        {
          key: 'ledger_url',
          title: 'Ledger preview link',
          variable: 'ledger_url',
          enabled: includeLedgerUrl,
        },
      ]}
      onClose={leave}
      onSave={async (next, notes) => {
        const includeLedger =
          typeof notes.shareUrlEnabled?.ledger_url === 'boolean'
            ? notes.shareUrlEnabled.ledger_url
            : includeLedgerUrl
        await saveAppSettings({
          transactionMessageTemplate: next,
          messageNotePlus: notes.plus,
          messageNoteMinus: notes.minus,
          messageNoteZero: notes.zero,
          transactionMessageIncludePdfUrl: false,
          transactionMessageIncludeLedgerUrl: includeLedger,
        })
      }}
    />
  )
}
