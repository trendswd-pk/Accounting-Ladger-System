import { NextResponse } from 'next/server'
import { toCsv } from '@/lib/csv'
import { mapTransactionRow } from '@/lib/transactions'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    let items: ReturnType<typeof mapTransactionRow>[] = []

    const { data, error } = await admin.rpc('rpc_list_transactions')
    if (!error) {
      items = ((Array.isArray(data) ? data : []) as RpcRow[]).map(mapTransactionRow)
    } else if (isMissingRpc(error)) {
      const { data: joinData, error: joinErr } = await admin
        .from('transactions')
        .select(
          'id, entry_number, transaction_date, account_id, narration, entry_type, balance, created_at, accounts ( name )'
        )
        .order('entry_number', { ascending: true })
      if (joinErr) {
        return NextResponse.json({ error: joinErr.message }, { status: 500 })
      }
      type JoinRow = RpcRow & {
        accounts: { name: string } | { name: string }[] | null
      }
      items = ((joinData ?? []) as unknown as JoinRow[]).map((r) => {
        const acc = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts
        return mapTransactionRow({
          ...r,
          account_name: acc?.name ?? '',
        })
      })
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const csv = toCsv(
      [
        'transaction_date',
        'account_name',
        'narration',
        'entry_type',
        'amount',
      ],
      items.map((t) => [
        t.transactionDate.slice(0, 10),
        t.accountName,
        t.narration,
        t.entryType,
        Math.abs(Number(t.balance) || 0),
      ])
    )

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="transactions-export.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
