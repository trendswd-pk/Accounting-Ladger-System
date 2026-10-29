import { NextResponse } from 'next/server'
import { buildDashboardExpenseSummary } from '@/lib/dashboardExpenseSummary'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

export async function GET() {
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
