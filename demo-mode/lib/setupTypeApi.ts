/**
 * Demo Mode setup-type API — localStorage-backed helpers (no NextResponse / Supabase).
 */
import {
  createSetupType,
  deleteSetupType,
  fetchSetupTypes,
  updateSetupType,
  type SetupTypeKind,
  type SetupTypeRecord,
} from '@/lib/setupTypes'

export type SetupTable = 'account_types' | 'cash_types'

function kindFor(table: SetupTable): SetupTypeKind {
  return table === 'account_types' ? 'account-types' : 'cash-types'
}

export async function listSetupTypes(
  table: SetupTable
): Promise<{ items: SetupTypeRecord[]; via: string }> {
  const items = await fetchSetupTypes(kindFor(table), { force: true })
  return { items, via: 'demo-store' }
}

export async function createSetupTypeRow(
  table: SetupTable,
  body: { name?: string; code?: string; description?: string; active?: boolean }
): Promise<{ item: SetupTypeRecord }> {
  const item = await createSetupType(kindFor(table), {
    name: String(body.name ?? ''),
    code: String(body.code ?? ''),
    description: String(body.description ?? ''),
    active: body.active !== false,
  })
  return { item }
}

export async function updateSetupTypeRow(
  table: SetupTable,
  id: string,
  body: { name?: string; code?: string; description?: string; active?: boolean }
): Promise<{ item: SetupTypeRecord }> {
  const item = await updateSetupType(kindFor(table), id, {
    name: String(body.name ?? ''),
    code: String(body.code ?? ''),
    description: String(body.description ?? ''),
    active: body.active !== false,
  })
  return { item }
}

export async function deleteSetupTypeRow(
  table: SetupTable,
  id: string
): Promise<{ ok: true }> {
  await deleteSetupType(kindFor(table), id)
  return { ok: true }
}
