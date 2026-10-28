import { createSetupTypeRow, listSetupTypes } from '@/lib/setupTypeApi'

export const dynamic = 'force-dynamic'

export async function GET() {
  return listSetupTypes('cash_types')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  return createSetupTypeRow('cash_types', body)
}
