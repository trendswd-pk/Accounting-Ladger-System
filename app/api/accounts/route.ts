import { createAccountRow, listAccounts } from '@/lib/accountsApi'

export const dynamic = 'force-dynamic'

export async function GET() {
  return listAccounts()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return createAccountRow(body)
}
