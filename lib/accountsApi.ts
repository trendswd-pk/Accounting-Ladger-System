import { NextResponse } from 'next/server'
import { mapAccountRow, type AccountRecord } from '@/lib/accounts'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeEntryType } from '@/lib/transactions'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
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
  phone: string | null
  account_type_id: string
  cash_type_id: string
  account_type_name: string
  account_type_code: string
  cash_type_name: string
  cash_type_code: string
  created_at: string
  balance?: number | string | null
}

type JoinRow = {
  id: string
  name: string
  phone: string | null
  account_type_id: string
  cash_type_id: string
  created_at: string
  account_types: { name: string; code: string } | { name: string; code: string }[] | null
  cash_types: { name: string; code: string } | { name: string; code: string }[] | null
}

async function loadBalancesByAccountId(): Promise<Map<string, number>> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('transactions')
    .select('account_id, entry_type, balance')

  const map = new Map<string, number>()
  if (error) {
    // Table/column may not exist yet — treat as zero balances.
    return map
  }

  for (const row of data ?? []) {
    const accountId = String((row as { account_id?: string }).account_id ?? '')
    if (!accountId) continue
    const entryType = normalizeEntryType((row as { entry_type?: string }).entry_type)
    const amount = Math.abs(Number((row as { balance?: number | string }).balance) || 0)
    const signed = entryType === 'debit' ? -amount : amount
    map.set(accountId, (map.get(accountId) ?? 0) + signed)
  }
  return map
}

function mapJoinWithBalance(r: JoinRow, balance: number): AccountRecord {
  const at = Array.isArray(r.account_types) ? r.account_types[0] : r.account_types
  const ct = Array.isArray(r.cash_types) ? r.cash_types[0] : r.cash_types
  return mapAccountRow({
    id: r.id,
    name: r.name,
    phone: r.phone,
    account_type_id: r.account_type_id,
    cash_type_id: r.cash_type_id,
    account_type_name: at?.name ?? '',
    account_type_code: at?.code ?? '',
    cash_type_name: ct?.name ?? '',
    cash_type_code: ct?.code ?? '',
    created_at: r.created_at,
    balance,
  })
}

async function listViaJoin() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('accounts')
    .select(
      `
      id, name, phone, account_type_id, cash_type_id, created_at,
      account_types ( name, code ),
      cash_types ( name, code )
    `
    )
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const balances = await loadBalancesByAccountId()
  const rows = (data ?? []) as unknown as JoinRow[]
  return rows.map((r) => mapJoinWithBalance(r, balances.get(r.id) ?? 0))
}

async function fetchAccountItem(id: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('accounts')
    .select(
      `
      id, name, phone, account_type_id, cash_type_id, created_at,
      account_types ( name, code ),
      cash_types ( name, code )
    `
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const balances = await loadBalancesByAccountId()
  return mapJoinWithBalance(data as unknown as JoinRow, balances.get(id) ?? 0)
}

export async function listAccounts() {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('rpc_list_accounts')
    if (error) {
      if (isMissingRpc(error)) {
        const items = await listViaJoin()
        return json({ items, via: 'select-fallback' })
      }
      return json({ error: error.message }, 500)
    }
    const rows = (Array.isArray(data) ? data : []) as RpcRow[]
    const items = rows.map(mapAccountRow)
    // Prefer live ledger totals so Balance stays correct even if RPC is outdated.
    const balances = await loadBalancesByAccountId()
    const withBalances = items.map((item) => ({
      ...item,
      balance: balances.get(item.id) ?? item.balance ?? 0,
    }))
    return json({ items: withBalances, via: 'rpc' })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function createAccountRow(body: {
  name?: string
  phone?: string
  accountTypeId?: string
  cashTypeId?: string
}) {
  try {
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const accountTypeId = String(body.accountTypeId ?? '').trim()
    const cashTypeId = String(body.cashTypeId ?? '').trim()

    if (!name) return json({ error: 'Account name is required.' }, 400)
    if (!accountTypeId) return json({ error: 'Account type is required.' }, 400)
    if (!cashTypeId) return json({ error: 'Cash type is required.' }, 400)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('accounts')
      .insert({
        name,
        phone,
        account_type_id: accountTypeId,
        cash_type_id: cashTypeId,
      })
      .select('id')
      .single()

    if (error) return json({ error: error.message }, 400)
    const item = await fetchAccountItem(data.id)
    return json({ item }, 201)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function updateAccountRow(
  id: string,
  body: { name?: string; phone?: string; accountTypeId?: string; cashTypeId?: string }
) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const accountTypeId = String(body.accountTypeId ?? '').trim()
    const cashTypeId = String(body.cashTypeId ?? '').trim()

    if (!name) return json({ error: 'Account name is required.' }, 400)
    if (!accountTypeId) return json({ error: 'Account type is required.' }, 400)
    if (!cashTypeId) return json({ error: 'Cash type is required.' }, 400)

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('accounts')
      .update({
        name,
        phone,
        account_type_id: accountTypeId,
        cash_type_id: cashTypeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return json({ error: error.message }, 400)
    const item = await fetchAccountItem(id)
    return json({ item })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function deleteAccountRow(id: string) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('accounts').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
