import { NextResponse } from 'next/server'
import { buildDashboardExpenseSummary } from '@/lib/dashboardExpenseSummary'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const today = new URL(request.url).searchParams.get('today')
    const summary = await buildDashboardExpenseSummary(today)
    return NextResponse.json(summary, { headers: NO_STORE })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500, headers: NO_STORE }
    )
  }
}
