import { NextResponse } from 'next/server'
import { mapTransactionRow, normalizeEntryType } from '@/lib/transactions'
import { getSupabaseAdmin } from '@/lib/supabase-server'

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
  entry_number: number | string
  transaction_date: string
  account_id: string
  account_name: string
  narration?: string | null
  entry_type?: string | null
  balance: number | string
  created_at: string
}

const SELECT_COLS = `
  id, entry_number, transaction_date, account_id, narration, entry_type, balance, created_at,
  accounts ( name )
`

type JoinRow = {
  id: string
  entry_number: number | string
  transaction_date: string
  account_id: string
  narration?: string | null
  entry_type?: string | null
  balance: number | string
  created_at: string
  accounts: { name: string } | { name: string }[] | null
}

function mapJoinRow(r: JoinRow) {
  const acc = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts
  return mapTransactionRow({
    id: r.id,
    entry_number: r.entry_number,
    transaction_date: r.transaction_date,
    account_id: r.account_id,
    account_name: acc?.name ?? '',
    narration: r.narration,
    entry_type: r.entry_type,
    balance: r.balance,
    created_at: r.created_at,
  })
}

async function listViaJoin(userId: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('transactions')
    .select(SELECT_COLS)
    .eq('user_id', userId)
    .order('entry_number', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as JoinRow[]
  return rows.map(mapJoinRow)
}

async function assertOwnedAccount(userId: string, accountId: string): Promise<string | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return error.message
  if (!data) return 'Account not found.'
  return null
}

export async function listTransactions(userId: string) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('rpc_list_transactions', {
      p_user_id: userId,
    })
    if (error) {
      if (isMissingRpc(error)) {
        const items = await listViaJoin(userId)
        return json({ items, via: 'select-fallback' })
      }
      return json({ error: error.message }, 500)
    }
    const rows = (Array.isArray(data) ? data : []) as RpcRow[]
    return json({ items: rows.map(mapTransactionRow), via: 'rpc' })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

type CreateBody = {
  transactionDate?: string
  accountId?: string
  narration?: string
  entryType?: string
  balance?: number | string
  items?: Array<{
    transactionDate?: string
    accountId?: string
    narration?: string
    entryType?: string
    balance?: number | string
  }>
}

type ParsedCreateRow = {
  transaction_date: string
  account_id: string
  narration: string
  entry_type: string
  balance: number
  user_id: string
}

function parseCreateItem(
  userId: string,
  body: {
    transactionDate?: string
    accountId?: string
    narration?: string
    entryType?: string
    balance?: number | string
  }
): { row: ParsedCreateRow } | { error: string } {
  const transactionDate = String(body.transactionDate ?? '').trim().slice(0, 10)
  const accountId = String(body.accountId ?? '').trim()
  const narration = String(body.narration ?? '').trim()
  const entryType = normalizeEntryType(body.entryType)
  const balance = Math.abs(Number(body.balance))

  if (!transactionDate) return { error: 'Transaction date is required.' }
  if (!accountId) return { error: 'Account is required.' }
  if (!narration) return { error: 'Narration is required.' }
  if (!Number.isFinite(balance)) return { error: 'Balance must be a number.' }

  return {
    row: {
      transaction_date: transactionDate,
      account_id: accountId,
      narration,
      entry_type: entryType,
      balance,
      user_id: userId,
    },
  }
}

export async function createTransactionRow(userId: string, body: CreateBody) {
  try {
    const admin = getSupabaseAdmin()

    if (Array.isArray(body.items)) {
      if (body.items.length === 0) {
        return json({ error: 'At least one transaction is required.' }, 400)
      }
      if (body.items.length > 40) {
        return json({ error: 'Too many transactions in one request.' }, 400)
      }
      const rows: ParsedCreateRow[] = []
      for (const raw of body.items) {
        const parsed = parseCreateItem(userId, raw)
        if ('error' in parsed) return json({ error: parsed.error }, 400)
        const owned = await assertOwnedAccount(userId, parsed.row.account_id)
        if (owned) return json({ error: owned }, 400)
        rows.push(parsed.row)
      }
      const { data, error } = await admin
        .from('transactions')
        .insert(rows)
        .select(SELECT_COLS)

      if (error) return json({ error: error.message }, 400)
      const items = ((data ?? []) as unknown as JoinRow[]).map(mapJoinRow)
      return json({ items, item: items[0] ?? null }, 201)
    }

    const parsed = parseCreateItem(userId, body)
    if ('error' in parsed) return json({ error: parsed.error }, 400)
    const owned = await assertOwnedAccount(userId, parsed.row.account_id)
    if (owned) return json({ error: owned }, 400)

    const { data, error } = await admin
      .from('transactions')
      .insert(parsed.row)
      .select(SELECT_COLS)
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ item: mapJoinRow(data as unknown as JoinRow) }, 201)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function updateTransactionRow(
  userId: string,
  id: string,
  body: {
    transactionDate?: string
    accountId?: string
    narration?: string
    entryType?: string
    balance?: number | string
  }
) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const transactionDate = String(body.transactionDate ?? '').trim().slice(0, 10)
    const accountId = String(body.accountId ?? '').trim()
    const narration = String(body.narration ?? '').trim()
    const entryType = normalizeEntryType(body.entryType)
    const balance = Math.abs(Number(body.balance))

    if (!transactionDate) return json({ error: 'Transaction date is required.' }, 400)
    if (!accountId) return json({ error: 'Account is required.' }, 400)
    if (!narration) return json({ error: 'Narration is required.' }, 400)
    if (!Number.isFinite(balance)) return json({ error: 'Balance must be a number.' }, 400)

    const owned = await assertOwnedAccount(userId, accountId)
    if (owned) return json({ error: owned }, 400)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('transactions')
      .update({
        transaction_date: transactionDate,
        account_id: accountId,
        narration,
        entry_type: entryType,
        balance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(SELECT_COLS)
      .maybeSingle()

    if (error) return json({ error: error.message }, 400)
    if (!data) return json({ error: 'Transaction not found.' }, 404)
    return json({ item: mapJoinRow(data as unknown as JoinRow) })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function deleteTransactionRow(userId: string, id: string) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (error) return json({ error: error.message }, 500)
    if (!data) return json({ error: 'Transaction not found.' }, 404)
    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
