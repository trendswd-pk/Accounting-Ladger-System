import { deleteTransactionRow, updateTransactionRow } from '@/lib/transactionsApi'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json().catch(() => ({}))
  return updateTransactionRow(params.id, body)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return deleteTransactionRow(params.id)
}
