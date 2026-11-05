import { NextResponse } from 'next/server'
import { getLedgerShareMeta } from '@/lib/ledgerShareServer'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

type Ctx = { params: { token: string } }

/** Public meta for the share landing page (no PIN required). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const meta = await getLedgerShareMeta(params.token)
    if (!meta) {
      return NextResponse.json(
        { error: 'Link not found.' },
        { status: 404, headers: NO_STORE }
      )
    }
    return NextResponse.json(meta, { headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500, headers: NO_STORE }
    )
  }
}
