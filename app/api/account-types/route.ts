import { createSetupTypeRow, listSetupTypes } from '@/lib/setupTypeApi'

export const dynamic = 'force-dynamic'

export async function GET() {
  return listSetupTypes('account_types')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return createSetupTypeRow('account_types', body)
}
