import { NextResponse } from 'next/server'
import { unlockLedgerShare } from '@/lib/ledgerShareServer'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

type Ctx = { params: { token: string } }

/** Public: verify PIN and return ledger payload. */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const body = (await request.json().catch(() => ({}))) as { pin?: string }
    const result = await unlockLedgerShare(params.token, String(body.pin ?? ''))
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: NO_STORE }
      )
    }
    return NextResponse.json(result.payload, { headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500, headers: NO_STORE }
    )
  }
}
