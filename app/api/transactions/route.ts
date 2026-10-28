import { createTransactionRow, listTransactions } from '@/lib/transactionsApi'

export const dynamic = 'force-dynamic'

export async function GET() {
  return listTransactions()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return createTransactionRow(body)
}
