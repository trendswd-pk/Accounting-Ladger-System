import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const BATCH_SIZE = 300

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

type ImportRow = {
  name?: string
  phone?: string
  accountType?: string
  cashType?: string
}

type DbInsert = {
  name: string
  phone: string
  account_type_id: string
  cash_type_id: string
  _line: number
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json().catch(() => ({}))
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : []
    const lineOffset = Math.max(0, Number(body.lineOffset) || 0)
    if (rows.length === 0) return json({ error: 'No account rows to import.' }, 400)
    if (rows.length > 2000) return json({ error: 'Max 2000 rows per request chunk.' }, 400)

    const admin = getSupabaseAdmin()
    const [{ data: accountTypes, error: atErr }, { data: cashTypes, error: ctErr }] =
      await Promise.all([
        admin.from('account_types').select('id, name, code'),
        admin.from('cash_types').select('id, name, code'),
      ])
    if (atErr) return json({ error: atErr.message }, 500)
    if (ctErr) return json({ error: ctErr.message }, 500)

    const resolveType = (
      list: Array<{ id: string; name: string; code: string }> | null,
      label: string
    ) => {
      const key = norm(label)
      if (!key) return null
      return (
        (list ?? []).find(
          (t) =>
            norm(t.name) === key ||
            norm(t.code) === key ||
            norm(t.code.replace(/_/g, ' ')) === key
        ) ?? null
      )
    }

    const { data: existing, error: exErr } = await admin.from('accounts').select('id, name')
    if (exErr) return json({ error: exErr.message }, 500)
    const existingNames = new Set((existing ?? []).map((a) => norm(String(a.name))))

    const ready: DbInsert[] = []
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const line = lineOffset + i + 2
      const name = String(row.name ?? '').trim()
      const phone = String(row.phone ?? '').trim()
      const accountTypeLabel = String(row.accountType ?? '').trim()
      const cashTypeLabel = String(row.cashType ?? '').trim()

      if (!name) {
        skipped++
        continue
      }
      if (existingNames.has(norm(name))) {
        skipped++
        continue
      }
      const accountType = resolveType(accountTypes, accountTypeLabel)
      const cashType = resolveType(cashTypes, cashTypeLabel)
      if (!accountType) {
        errors.push(`Row ${line}: unknown Account Type "${accountTypeLabel || '(empty)'}"`)
        continue
      }
      if (!cashType) {
        errors.push(`Row ${line}: unknown Cash Type "${cashTypeLabel || '(empty)'}"`)
        continue
      }

      existingNames.add(norm(name))
      ready.push({
        name,
        phone,
        account_type_id: accountType.id,
        cash_type_id: cashType.id,
        _line: line,
      })
    }

    let imported = 0

    for (let i = 0; i < ready.length; i += BATCH_SIZE) {
      const slice = ready.slice(i, i + BATCH_SIZE)
      const payload = slice.map(({ _line: _ignored, ...rest }) => rest)
      const { error } = await admin.from('accounts').insert(payload)
      if (!error) {
        imported += payload.length
        continue
      }
      for (const item of slice) {
        const { _line, ...rest } = item
        const { error: rowErr } = await admin.from('accounts').insert(rest)
        if (rowErr) errors.push(`Row ${_line}: ${rowErr.message}`)
        else imported++
      }
    }

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
