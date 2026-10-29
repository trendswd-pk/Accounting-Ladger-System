import { recordRequestDeduped } from '@/lib/requestProfiler'
import type { ThemePreference } from '@/lib/theme'

export type DefaultEntryMode = 'normal' | 'transfer'

export type AppSettings = {
  businessName: string
  currency: string
  theme: ThemePreference
  defaultEntryMode: DefaultEntryMode
  cashSavingsCashTypeIds: string[]
  cashSavingsAccountTypeIds: string[]
  /** Shared filter for Payable (−) and Receivable (+) pages/cards. */
  payableReceivableCashTypeIds: string[]
  payableReceivableAccountTypeIds: string[]
  updatedAt?: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'My Business',
  currency: 'PKR',
  theme: 'dark',
  defaultEntryMode: 'normal',
  cashSavingsCashTypeIds: [],
  cashSavingsAccountTypeIds: [],
  payableReceivableCashTypeIds: [],
  payableReceivableAccountTypeIds: [],
}

type DbRow = {
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  cash_savings_cash_type_ids?: unknown
  cash_savings_account_type_ids?: unknown
  payable_receivable_cash_type_ids?: unknown
  payable_receivable_account_type_ids?: unknown
  /** Legacy separate columns (fallback). */
  payable_cash_type_ids?: unknown
  payable_account_type_ids?: unknown
  receivable_cash_type_ids?: unknown
  receivable_account_type_ids?: unknown
  updated_at?: string
}

export function normalizeDefaultEntryMode(value: unknown): DefaultEntryMode {
  return value === 'transfer' ? 'transfer' : 'normal'
}

export function normalizeUuidIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const id = String(item ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** @deprecated use normalizeUuidIdList */
export const normalizeCashSavingsCashTypeIds = normalizeUuidIdList
/** @deprecated use normalizeUuidIdList */
export const normalizeCashSavingsAccountTypeIds = normalizeUuidIdList

function firstNonEmptyIdList(...values: unknown[]): string[] {
  for (const value of values) {
    const ids = normalizeUuidIdList(value)
    if (ids.length > 0) return ids
  }
  return []
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    cashSavingsCashTypeIds: [...settings.cashSavingsCashTypeIds],
    cashSavingsAccountTypeIds: [...settings.cashSavingsAccountTypeIds],
    payableReceivableCashTypeIds: [...settings.payableReceivableCashTypeIds],
    payableReceivableAccountTypeIds: [...settings.payableReceivableAccountTypeIds],
  }
}

function withIdDefaults(settings: AppSettings): AppSettings {
  return {
    ...settings,
    cashSavingsCashTypeIds: settings.cashSavingsCashTypeIds ?? [],
    cashSavingsAccountTypeIds: settings.cashSavingsAccountTypeIds ?? [],
    payableReceivableCashTypeIds: settings.payableReceivableCashTypeIds ?? [],
    payableReceivableAccountTypeIds: settings.payableReceivableAccountTypeIds ?? [],
  }
}

export function mapAppSettingsRow(row: DbRow): AppSettings {
  const theme: ThemePreference = row.theme === 'light' ? 'light' : 'dark'
  return {
    businessName: row.business_name || DEFAULT_APP_SETTINGS.businessName,
    currency: row.currency || DEFAULT_APP_SETTINGS.currency,
    theme,
    defaultEntryMode: normalizeDefaultEntryMode(row.default_entry_mode),
    cashSavingsCashTypeIds: normalizeUuidIdList(row.cash_savings_cash_type_ids),
    cashSavingsAccountTypeIds: normalizeUuidIdList(row.cash_savings_account_type_ids),
    payableReceivableCashTypeIds: firstNonEmptyIdList(
      row.payable_receivable_cash_type_ids,
      row.payable_cash_type_ids,
      row.receivable_cash_type_ids
    ),
    payableReceivableAccountTypeIds: firstNonEmptyIdList(
      row.payable_receivable_account_type_ids,
      row.payable_account_type_ids,
      row.receivable_account_type_ids
    ),
    updatedAt: row.updated_at,
  }
}

const SETTINGS_ENDPOINT = '/api/settings'
const SETTINGS_CHANGED_EVENT = 'app-settings-changed'
let settingsInflight: Promise<AppSettings> | null = null
let settingsCache: AppSettings | null = null

export function invalidateAppSettingsCache(): void {
  settingsInflight = null
  settingsCache = null
}

export function getCachedAppSettings(): AppSettings | null {
  return settingsCache ? cloneSettings(settingsCache) : null
}

function notifySettingsChanged(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }))
}

export function subscribeAppSettings(listener: (settings: AppSettings) => void): () => void {
  const handler = (e: Event) => {
    listener((e as CustomEvent<AppSettings>).detail)
  }
  window.addEventListener(SETTINGS_CHANGED_EVENT, handler)
  return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler)
}

export async function fetchAppSettings(): Promise<AppSettings> {
  if (settingsCache) {
    recordRequestDeduped(SETTINGS_ENDPOINT)
    return cloneSettings(settingsCache)
  }
  if (settingsInflight) {
    recordRequestDeduped(SETTINGS_ENDPOINT)
    return settingsInflight
  }

  const req = (async () => {
    const res = await fetch(SETTINGS_ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load settings')
    }
    settingsCache = withIdDefaults(data.settings as AppSettings)
    notifySettingsChanged(settingsCache)
    return cloneSettings(settingsCache)
  })()

  settingsInflight = req
  try {
    return await req
  } finally {
    if (settingsInflight === req) settingsInflight = null
  }
}

export type AppSettingsPatch = Partial<
  Pick<
    AppSettings,
    | 'businessName'
    | 'currency'
    | 'theme'
    | 'defaultEntryMode'
    | 'cashSavingsCashTypeIds'
    | 'cashSavingsAccountTypeIds'
    | 'payableReceivableCashTypeIds'
    | 'payableReceivableAccountTypeIds'
  >
>

export async function saveAppSettings(input: AppSettingsPatch): Promise<AppSettings> {
  const res = await fetch(SETTINGS_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save settings')
  }
  settingsCache = withIdDefaults(data.settings as AppSettings)
  notifySettingsChanged(settingsCache)
  return cloneSettings(settingsCache)
}
