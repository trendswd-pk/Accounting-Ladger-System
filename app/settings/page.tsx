'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  applyThemePreference,
  getDefaultTheme,
  type ThemePreference,
} from '@/lib/theme'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(DEFAULT_APP_SETTINGS.businessName)
  const [currency, setCurrency] = useState(DEFAULT_APP_SETTINGS.currency)
  const [theme, setTheme] = useState<ThemePreference>(getDefaultTheme())
  const [defaultEntryMode, setDefaultEntryMode] = useState<DefaultEntryMode>(
    DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchAppSettings()
      .then((s) => {
        if (cancelled) return
        setBusinessName(s.businessName)
        setCurrency(s.currency)
        setTheme(s.theme)
        setDefaultEntryMode(s.defaultEntryMode)
        applyThemePreference(s.theme)
      })
      .catch((err) => {
        if (cancelled) return
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load settings from Supabase.',
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const name = businessName.trim()
    if (!name) {
      setMessage({ type: 'error', text: 'Business name is required.' })
      return
    }
    setSaving(true)
    try {
      const saved = await saveAppSettings({
        businessName: name,
        currency,
        theme,
        defaultEntryMode,
      })
      setBusinessName(saved.businessName)
      setCurrency(saved.currency)
      setTheme(saved.theme)
      setDefaultEntryMode(saved.defaultEntryMode)
      applyThemePreference(saved.theme)
      setMessage({ type: 'success', text: 'Settings saved to Supabase.' })
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
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Business profile and display preferences — stored in Supabase.
        </p>
      </div>

      <form
        onSubmit={(e) => void handleSave(e)}
        className={`space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 ${
          loading ? 'opacity-70 pointer-events-none' : ''
        }`}
      >
        <div>
          <label htmlFor="businessName" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
            placeholder="Your company name"
            autoComplete="organization"
          />
        </div>

        <div>
          <label htmlFor="currency" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
          >
            <option value="PKR">PKR — Pakistani Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="AED">AED — UAE Dirham</option>
          </select>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setTheme(option)
                  applyThemePreference(option)
                }}
                className={`rounded-md border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  theme === option
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default transaction entry mode
          </span>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Pre-selected when you open Add Transaction. You can still switch on the form.
          </p>
          <div className="flex gap-3">
            {(
              [
                { id: 'normal' as const, label: 'Normal Entry' },
                { id: 'transfer' as const, label: 'Transfer' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDefaultEntryMode(option.id)}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  defaultEntryMode === option.id
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <p
            className={`text-sm ${
              message.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
