import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { bootstrapUserLedger } from '@/lib/userBootstrap'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

/**
 * Idempotent seed after signup / first login:
 * creates this user's app_settings + default account/cash types only.
 */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  try {
    const body = (await request.json().catch(() => ({}))) as {
      businessName?: string
    }
    const bodyName = String(body.businessName ?? '').trim()
    const metaName =
      typeof auth.user.user_metadata?.business_name === 'string'
        ? auth.user.user_metadata.business_name.trim()
        : ''
    const result = await bootstrapUserLedger(
      auth.user.id,
      bodyName || metaName || null
    )
    return NextResponse.json(result, { status: 200, headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not set up your ledger. Run the multi-tenant migration if needed.',
      },
      { status: 500, headers: NO_STORE }
    )
  }
}
