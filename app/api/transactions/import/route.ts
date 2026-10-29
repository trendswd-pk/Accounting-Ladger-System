import { NextResponse } from 'next/server'
import { normalizeEntryType } from '@/lib/transactions'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

type ImportRow = {
  transactionDate?: string
  accountName?: string
  accountId?: string
  narration?: string
  entryType?: string
  balance?: number | string
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : []
    if (rows.length === 0) return json({ error: 'No transaction rows to import.' }, 400)
    if (rows.length > 5000) return json({ error: 'Max 5000 transactions per import.' }, 400)

    const admin = getSupabaseAdmin()
    const { data: accounts, error: accErr } = await admin
      .from('accounts')
      .select('id, name')
    if (accErr) return json({ error: accErr.message }, 500)

    const byId = new Map((accounts ?? []).map((a) => [String(a.id), a]))
    const byName = new Map<string, { id: string; name: string }>()
    for (const a of accounts ?? []) {
      byName.set(norm(String(a.name)), a)
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const line = i + 2
      const transactionDate = String(row.transactionDate ?? '').trim().slice(0, 10)
      const accountIdRaw = String(row.accountId ?? '').trim()
      const accountName = String(row.accountName ?? '').trim()
      const narration = String(row.narration ?? '').trim() || 'Imported'
      const entryType = normalizeEntryType(row.entryType)
      const balance = Math.abs(Number(row.balance))

      if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
        errors.push(`Row ${line}: invalid date (use YYYY-MM-DD)`)
        continue
      }
      if (!Number.isFinite(balance) || balance <= 0) {
        errors.push(`Row ${line}: amount must be greater than 0`)
        continue
      }

      const account =
        (accountIdRaw ? byId.get(accountIdRaw) : null) ??
        (accountName ? byName.get(norm(accountName)) : null)
      if (!account) {
        errors.push(
          `Row ${line}: account not found "${accountName || accountIdRaw || '(empty)'}"`
        )
        continue
      }

      const { error } = await admin.from('transactions').insert({
        transaction_date: transactionDate,
        account_id: account.id,
        narration,
        entry_type: entryType,
        balance,
      })
      if (error) {
        errors.push(`Row ${line}: ${error.message}`)
        continue
      }
      imported++
    }

    if (imported === 0 && errors.length === 0) skipped = rows.length

    return json({
      imported,
      skipped,
      errors: errors.slice(0, 25),
      errorCount: errors.length,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
