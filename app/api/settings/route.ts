import { NextResponse } from 'next/server'
import {
  DEFAULT_APP_SETTINGS,
  mapAppSettingsRow,
  normalizeCashSavingsAccountTypeIds,
  normalizeCashSavingsCashTypeIds,
  normalizeDefaultEntryMode,
} from '@/lib/appSettings'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

type RpcSettings = {
  id?: number
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  cash_savings_cash_type_ids?: unknown
  cash_savings_account_type_ids?: unknown
  updated_at?: string
}

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist|schema cache/i.test(msg)
  )
}

const SELECT_FULL =
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, cash_savings_account_type_ids, updated_at'
const SELECT_CASH_ONLY =
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, updated_at'
const SELECT_WITH_ENTRY =
  'business_name, currency, theme, default_entry_mode, updated_at'
const SELECT_LEGACY = 'business_name, currency, theme, updated_at'

async function readSettingsRow() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('rpc_get_app_settings')
  if (!error) return mapAppSettingsRow(data as RpcSettings)

  if (!isMissingRpc(error)) throw new Error(error.message)

  // Fallback until RPC is applied
  const { data: row, error: selectError } = await admin
    .from('app_settings')
    .select(SELECT_FULL)
    .eq('id', 1)
    .maybeSingle()
  if (selectError) {
    if (/cash_savings_account_type_ids/i.test(selectError.message)) {
      const { data: cashOnly, error: cashOnlyError } = await admin
        .from('app_settings')
        .select(SELECT_CASH_ONLY)
        .eq('id', 1)
        .maybeSingle()
      if (cashOnlyError) {
        if (/cash_savings_cash_type_ids/i.test(cashOnlyError.message)) {
          return readWithoutCashSavingsColumns(admin)
        }
        throw new Error(cashOnlyError.message)
      }
      if (cashOnly) return mapAppSettingsRow(cashOnly)
      return { ...DEFAULT_APP_SETTINGS }
    }
    if (/cash_savings_cash_type_ids/i.test(selectError.message)) {
      return readWithoutCashSavingsColumns(admin)
    }
    if (/default_entry_mode/i.test(selectError.message)) {
      const { data: legacy, error: legacyError } = await admin
        .from('app_settings')
        .select(SELECT_LEGACY)
        .eq('id', 1)
        .maybeSingle()
      if (legacyError) throw new Error(legacyError.message)
      if (legacy) return mapAppSettingsRow(legacy)
      return { ...DEFAULT_APP_SETTINGS }
    }
    throw new Error(selectError.message)
  }
  if (row) return mapAppSettingsRow(row)
  return { ...DEFAULT_APP_SETTINGS }
}

async function readWithoutCashSavingsColumns(
  admin: ReturnType<typeof getSupabaseAdmin>
) {
  const { data: mid, error: midError } = await admin
    .from('app_settings')
    .select(SELECT_WITH_ENTRY)
    .eq('id', 1)
    .maybeSingle()
  if (midError) {
    if (/default_entry_mode/i.test(midError.message)) {
      const { data: legacy, error: legacyError } = await admin
        .from('app_settings')
        .select(SELECT_LEGACY)
        .eq('id', 1)
        .maybeSingle()
      if (legacyError) throw new Error(legacyError.message)
      if (legacy) return mapAppSettingsRow(legacy)
      return { ...DEFAULT_APP_SETTINGS }
    }
    throw new Error(midError.message)
  }
  if (mid) return mapAppSettingsRow(mid)
  return { ...DEFAULT_APP_SETTINGS }
}

async function ensureSettingsRow() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('app_settings')
    .select('id')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (data) return

  const { error: insertError } = await admin.from('app_settings').insert({
    id: 1,
    business_name: DEFAULT_APP_SETTINGS.businessName,
    currency: DEFAULT_APP_SETTINGS.currency,
    theme: DEFAULT_APP_SETTINGS.theme,
    default_entry_mode: DEFAULT_APP_SETTINGS.defaultEntryMode,
    cash_savings_cash_type_ids: DEFAULT_APP_SETTINGS.cashSavingsCashTypeIds,
    cash_savings_account_type_ids: DEFAULT_APP_SETTINGS.cashSavingsAccountTypeIds,
  })
  if (insertError && insertError.code !== '23505') throw new Error(insertError.message)
}

export async function GET() {
  try {
    const settings = await readSettingsRow()
    return json({ settings })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.businessName !== undefined) {
      const businessName = String(body.businessName).trim()
      if (!businessName) return json({ error: 'Business name is required.' }, 400)
      patch.business_name = businessName
    }
    if (body.currency !== undefined) {
      const currency = String(body.currency).trim().toUpperCase()
      if (!currency) return json({ error: 'Currency is required.' }, 400)
      patch.currency = currency
    }
    if (body.theme !== undefined) {
      const theme = body.theme === 'light' ? 'light' : body.theme === 'dark' ? 'dark' : null
      if (!theme) return json({ error: 'Theme must be light or dark.' }, 400)
      patch.theme = theme
    }
    if (body.defaultEntryMode !== undefined) {
      patch.default_entry_mode = normalizeDefaultEntryMode(body.defaultEntryMode)
    }
    if (body.cashSavingsCashTypeIds !== undefined) {
      patch.cash_savings_cash_type_ids = normalizeCashSavingsCashTypeIds(
        body.cashSavingsCashTypeIds
      )
    }
    if (body.cashSavingsAccountTypeIds !== undefined) {
      patch.cash_savings_account_type_ids = normalizeCashSavingsAccountTypeIds(
        body.cashSavingsAccountTypeIds
      )
    }

    await ensureSettingsRow()
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('app_settings').update(patch).eq('id', 1)
    if (error) {
      if (
        /cash_savings_cash_type_ids|cash_savings_account_type_ids/i.test(error.message)
      ) {
        return json(
          {
            error:
              'Cash & Savings columns missing. Run database/settings-cash-savings-types.sql in Supabase.',
          },
          500
        )
      }
      return json({ error: error.message }, 500)
    }

    const settings = await readSettingsRow()
    return json({ settings })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
