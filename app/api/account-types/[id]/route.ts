import { deleteSetupTypeRow, updateSetupTypeRow } from '@/lib/setupTypeApi'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const body = await request.json().catch(() => ({}))
  return updateSetupTypeRow('account_types', params.id, body)
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  return deleteSetupTypeRow('account_types', params.id)
}
