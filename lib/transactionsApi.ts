import { NextResponse } from 'next/server'
import { mapTransactionRow } from '@/lib/transactions'
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
  balance: number | string
  created_at: string
}

async function listViaJoin() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('transactions')
    .select(
      `
      id, entry_number, transaction_date, account_id, balance, created_at,
      accounts ( name )
    `
    )
    .order('entry_number', { ascending: false })

  if (error) throw new Error(error.message)

  type JoinRow = {
    id: string
    entry_number: number | string
    transaction_date: string
    account_id: string
    balance: number | string
    created_at: string
    accounts: { name: string } | { name: string }[] | null
  }

  const rows = (data ?? []) as unknown as JoinRow[]
  return rows.map((r) => {
    const acc = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts
    return mapTransactionRow({
      id: r.id,
      entry_number: r.entry_number,
      transaction_date: r.transaction_date,
      account_id: r.account_id,
      account_name: acc?.name ?? '',
      balance: r.balance,
      created_at: r.created_at,
    })
  })
}

async function fetchTransactionItem(id: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('transactions')
    .select(
      `
      id, entry_number, transaction_date, account_id, balance, created_at,
      accounts ( name )
    `
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const r = data as unknown as {
    id: string
    entry_number: number | string
    transaction_date: string
    account_id: string
    balance: number | string
    created_at: string
    accounts: { name: string } | { name: string }[] | null
  }
  const acc = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts
  return mapTransactionRow({
    id: r.id,
    entry_number: r.entry_number,
    transaction_date: r.transaction_date,
    account_id: r.account_id,
    account_name: acc?.name ?? '',
    balance: r.balance,
    created_at: r.created_at,
  })
}

export async function listTransactions() {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('rpc_list_transactions')
    if (error) {
      if (isMissingRpc(error)) {
        const items = await listViaJoin()
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

export async function createTransactionRow(body: {
  transactionDate?: string
  accountId?: string
  balance?: number | string
}) {
  try {
    const transactionDate = String(body.transactionDate ?? '').trim().slice(0, 10)
    const accountId = String(body.accountId ?? '').trim()
    const balance = Number(body.balance)

    if (!transactionDate) return json({ error: 'Transaction date is required.' }, 400)
    if (!accountId) return json({ error: 'Account is required.' }, 400)
    if (!Number.isFinite(balance)) return json({ error: 'Balance must be a number.' }, 400)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('transactions')
      .insert({
        transaction_date: transactionDate,
        account_id: accountId,
        balance,
      })
      .select('id')
      .single()

    if (error) return json({ error: error.message }, 400)
    const item = await fetchTransactionItem(data.id)
    return json({ item }, 201)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function updateTransactionRow(
  id: string,
  body: { transactionDate?: string; accountId?: string; balance?: number | string }
) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const transactionDate = String(body.transactionDate ?? '').trim().slice(0, 10)
    const accountId = String(body.accountId ?? '').trim()
    const balance = Number(body.balance)

    if (!transactionDate) return json({ error: 'Transaction date is required.' }, 400)
    if (!accountId) return json({ error: 'Account is required.' }, 400)
    if (!Number.isFinite(balance)) return json({ error: 'Balance must be a number.' }, 400)

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('transactions')
      .update({
        transaction_date: transactionDate,
        account_id: accountId,
        balance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return json({ error: error.message }, 400)
    const item = await fetchTransactionItem(id)
    return json({ item })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function deleteTransactionRow(id: string) {
  try {
    if (!id) return json({ error: 'Missing id.' }, 400)
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('transactions').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
