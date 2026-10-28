import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { mapSetupTypeRow } from '@/lib/setupTypes'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export type SetupTable = 'account_types' | 'cash_types'

const LIST_RPC: Record<SetupTable, string> = {
  account_types: 'rpc_list_account_types',
  cash_types: 'rpc_list_cash_types',
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

function uniqueCodeError(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null
  if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
    return 'This code is already in use.'
  }
  return error.message || 'Database error'
}

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist|schema cache/i.test(msg)
  )
}

type RpcRow = {
  id: string
  name: string
  code: string
  description: string | null
  active: boolean
  created_at: string
}

async function listViaSelect(table: SetupTable) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from(table)
    .select('id, name, code, description, active, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapSetupTypeRow)
}

export async function listSetupTypes(table: SetupTable) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc(LIST_RPC[table])
    if (error) {
      if (isMissingRpc(error)) {
        const items = await listViaSelect(table)
        return json({ items, via: 'select-fallback' })
      }
      return json({ error: error.message }, 500)
    }

    const rows = (Array.isArray(data) ? data : []) as RpcRow[]
    return json({ items: rows.map(mapSetupTypeRow), via: 'rpc' })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function createSetupTypeRow(
  table: SetupTable,
  body: { name?: string; code?: string; description?: string; active?: boolean }
) {
  try {
    const name = String(body.name ?? '').trim()
    const code = String(body.code ?? '').trim().toUpperCase()
    const description = String(body.description ?? '').trim()
    const active = body.active !== false

    if (!name) return json({ error: 'Name is required.' }, 400)
    if (!code) return json({ error: 'Code is required.' }, 400)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from(table)
      .insert({ name, code, description, active })
      .select('id, name, code, description, active, created_at')
      .single()

    const uniqueMsg = uniqueCodeError(error)
    if (error) return json({ error: uniqueMsg }, 400)
    return json({ item: mapSetupTypeRow(data) }, 201)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function updateSetupTypeRow(
  table: SetupTable,
  id: string,
  body: { name?: string; code?: string; description?: string; active?: boolean }
) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)

    const name = String(body.name ?? '').trim()
    const code = String(body.code ?? '').trim().toUpperCase()
    const description = String(body.description ?? '').trim()
    const active = body.active !== false

    if (!name) return json({ error: 'Name is required.' }, 400)
    if (!code) return json({ error: 'Code is required.' }, 400)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from(table)
      .update({ name, code, description, active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, code, description, active, created_at')
      .single()

    if (error) {
      const uniqueMsg = uniqueCodeError(error)
      return json({ error: uniqueMsg }, error.code === 'PGRST116' ? 404 : 400)
    }
    return json({ item: mapSetupTypeRow(data) })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function deleteSetupTypeRow(table: SetupTable, id: string) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const admin = getSupabaseAdmin()
    const { error } = await admin.from(table).delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
