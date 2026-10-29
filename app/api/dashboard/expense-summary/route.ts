import { NextResponse } from 'next/server'
import { buildDashboardExpenseSummary } from '@/lib/dashboardExpenseSummary'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const summary = await buildDashboardExpenseSummary()
    return NextResponse.json(summary, { headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500, headers: NO_STORE }
    )
  }
}
