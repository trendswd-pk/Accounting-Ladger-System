import { createAccountRow, listAccounts } from '@/lib/accountsApi'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  return listAccounts()
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const body = await request.json().catch(() => ({}))
  return createAccountRow(body)
}
