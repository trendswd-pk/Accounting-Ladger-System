import { NextResponse } from 'next/server'
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
  name?: string
  phone?: string
  accountType?: string
  cashType?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rows = Array.isArray(body.rows) ? (body.rows as ImportRow[]) : []
    if (rows.length === 0) return json({ error: 'No account rows to import.' }, 400)
    if (rows.length > 2000) return json({ error: 'Max 2000 accounts per import.' }, 400)

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
          (t) => norm(t.name) === key || norm(t.code) === key || norm(t.code.replace(/_/g, ' ')) === key
        ) ?? null
      )
    }

    const { data: existing, error: exErr } = await admin.from('accounts').select('id, name')
    if (exErr) return json({ error: exErr.message }, 500)
    const existingNames = new Set((existing ?? []).map((a) => norm(String(a.name))))

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const line = i + 2
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

      const { error } = await admin.from('accounts').insert({
        name,
        phone,
        account_type_id: accountType.id,
        cash_type_id: cashType.id,
      })
      if (error) {
        errors.push(`Row ${line}: ${error.message}`)
        continue
      }
      existingNames.add(norm(name))
      imported++
    }

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
