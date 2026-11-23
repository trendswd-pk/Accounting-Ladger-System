import { NextResponse } from 'next/server'
import { normalizeEntryType } from '@/lib/transactions'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const BATCH_SIZE = 400

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

type DbInsert = {
  transaction_date: string
  account_id: string
  narration: string
  entry_type: 'credit' | 'debit'
  balance: number
  _line: number
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json().catch(() => ({}))
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : []
    const lineOffset = Math.max(0, Number(body.lineOffset) || 0)
    if (rows.length === 0) return json({ error: 'No transaction rows to import.' }, 400)
    if (rows.length > 2000) return json({ error: 'Max 2000 rows per request chunk.' }, 400)

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

    const ready: DbInsert[] = []
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const line = lineOffset + i + 2
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

      ready.push({
        transaction_date: transactionDate,
        account_id: account.id,
        narration,
        entry_type: entryType,
        balance,
        _line: line,
      })
    }

    let imported = 0

    for (let i = 0; i < ready.length; i += BATCH_SIZE) {
      const slice = ready.slice(i, i + BATCH_SIZE)
      const payload = slice.map(({ _line: _ignored, ...rest }) => rest)
      const { error } = await admin.from('transactions').insert(payload)
      if (!error) {
        imported += payload.length
        continue
      }

      // Fallback: isolate bad rows in this batch only
      for (const item of slice) {
        const { _line, ...rest } = item
        const { error: rowErr } = await admin.from('transactions').insert(rest)
        if (rowErr) {
          errors.push(`Row ${_line}: ${rowErr.message}`)
        } else {
          imported++
        }
      }
    }

    if (imported === 0 && errors.length === 0) skipped = rows.length

    return json({
      imported,
      skipped,
      errors: errors.slice(0, 40),
      errorCount: errors.length,
      processed: rows.length,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
