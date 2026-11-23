import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createLedgerShareForAccount } from '@/lib/ledgerShareServer'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  try {
    const body = (await request.json().catch(() => ({}))) as {
      accountId?: string
      ttlHours?: number
    }
    const accountId = String(body.accountId ?? '').trim()
    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required.' },
        { status: 400, headers: NO_STORE }
      )
    }
    const created = await createLedgerShareForAccount(accountId, request, {
      ttlHours: body.ttlHours,
    })
    return NextResponse.json(created, { status: 201, headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Could not create ledger share.',
      },
      { status: 500, headers: NO_STORE }
    )
  }
}
