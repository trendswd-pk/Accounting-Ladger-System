import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vercel Cron hits this path on the schedule in vercel.json.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Hook scheduled jobs here (cleanup, digests, etc.).
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
  })
}
