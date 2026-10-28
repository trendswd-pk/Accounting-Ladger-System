import { deleteAccountRow, updateAccountRow } from '@/lib/accountsApi'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json().catch(() => ({}))
  return updateAccountRow(params.id, body)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return deleteAccountRow(params.id)
}
