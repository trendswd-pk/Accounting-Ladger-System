import { deleteSetupTypeRow, updateSetupTypeRow } from '@/lib/setupTypeApi'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json().catch(() => ({}))
  return updateSetupTypeRow('account_types', params.id, body)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return deleteSetupTypeRow('account_types', params.id)
}
