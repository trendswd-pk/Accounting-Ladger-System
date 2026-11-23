'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BrandAssetField,
  inputClass,
  SettingRow,
  SettingsDetailShell,
} from '@/components/settings/SettingsShared'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
} from '@/lib/appSettings'
import {
  applyThemePreference,
  getDefaultTheme,
  type ThemePreference,
} from '@/lib/theme'

export default function BusinessSettingsPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(DEFAULT_APP_SETTINGS.businessName)
  const [currency, setCurrency] = useState(DEFAULT_APP_SETTINGS.currency)
  const [theme, setTheme] = useState<ThemePreference>(getDefaultTheme())
  const [logoUrl, setLogoUrl] = useState<string | null>(DEFAULT_APP_SETTINGS.logoUrl)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(
    DEFAULT_APP_SETTINGS.faviconUrl
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
        setBusinessName(s.businessName)
        setCurrency(s.currency)
        setTheme(s.theme)
        setLogoUrl(s.logoUrl)
        setFaviconUrl(s.faviconUrl)
        applyThemePreference(s.theme)
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
      const saved = await saveAppSettings({
        businessName,
        currency,
        theme,
        logoUrl,
        faviconUrl,
      })
      setBusinessName(saved.businessName)
      setCurrency(saved.currency)
      setTheme(saved.theme)
      setLogoUrl(saved.logoUrl)
      setFaviconUrl(saved.faviconUrl)
      applyThemePreference(saved.theme)
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
      title="Business"
      info="Business name, branding, currency, and theme for this app."
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
          label="Business name"
          description="Shown in the sidebar and header when no logo is set."
          htmlFor="businessName"
        >
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
            placeholder="Your company name"
            autoComplete="organization"
          />
        </SettingRow>

        <div className="grid grid-cols-1 divide-y divide-gray-200 border-b border-gray-200 dark:divide-gray-700 dark:border-gray-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-4">
            <BrandAssetField
              id="businessLogo"
              label="Logo"
              description="Optional. When uploaded, replaces the business name in the header and sidebar."
              value={logoUrl}
              previewClassName="h-7 max-w-full object-contain"
              disabled={saving || loading}
              onUploaded={(url) => {
                setLogoUrl(url)
                setMessage(null)
              }}
              onClear={() => setLogoUrl(null)}
              onError={(text) => setMessage({ type: 'error', text })}
            />
          </div>
          <div className="px-4 py-4">
            <BrandAssetField
              id="businessFavicon"
              label="Favicon"
              description="Optional. Browser tab icon for this app. PNG, ICO, or SVG work best."
              value={faviconUrl}
              previewClassName="h-7 w-7 object-contain"
              disabled={saving || loading}
              onUploaded={(url) => {
                setFaviconUrl(url)
                setMessage(null)
              }}
              onClear={() => setFaviconUrl(null)}
              onError={(text) => setMessage({ type: 'error', text })}
            />
          </div>
        </div>

        <SettingRow
          label="Default currency"
          description="Used for balances and amounts across the app."
          htmlFor="currency"
        >
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
        </SettingRow>

        <SettingRow label="Theme" description="App appearance preference." inline>
          <div className="flex flex-nowrap justify-end gap-2">
            {(['light', 'dark'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setTheme(option)
                  applyThemePreference(option)
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors sm:px-4 sm:py-2 ${
                  theme === option
                    ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </SettingRow>
      </div>
    </SettingsDetailShell>
  )
}
