import { NextResponse } from 'next/server'
import { DEFAULT_APP_SETTINGS, mapAppSettingsRow } from '@/lib/appSettings'
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

async function readSettingsRow() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('rpc_get_app_settings')
  if (!error) return mapAppSettingsRow(data as RpcSettings)

  if (!isMissingRpc(error)) throw new Error(error.message)

  // Fallback until database/rpcs.sql is applied
  const { data: row, error: selectError } = await admin
    .from('app_settings')
    .select('business_name, currency, theme, updated_at')
    .eq('id', 1)
    .maybeSingle()
  if (selectError) throw new Error(selectError.message)
  if (row) return mapAppSettingsRow(row)
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
    const patch: Record<string, string> = {
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

    await ensureSettingsRow()
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('app_settings').update(patch).eq('id', 1)
    if (error) return json({ error: error.message }, 500)

    const settings = await readSettingsRow()
    return json({ settings })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
