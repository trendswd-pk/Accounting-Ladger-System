import { recordRequestDeduped } from '@/lib/requestProfiler'

export type SetupTypeRecord = {
  id: string
  name: string
  code: string
  description: string
  active: boolean
  createdAt: string
}

export type SetupTypeKind = 'account-types' | 'cash-types'

type DbRow = {
  id: string
  name: string
  code: string
  description: string | null
  active: boolean
  created_at: string
}

export function mapSetupTypeRow(row: DbRow): SetupTypeRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description ?? '',
    active: !!row.active,
    createdAt: row.created_at,
  }
}

const listCache = new Map<SetupTypeKind, SetupTypeRecord[]>()
const listInflight = new Map<SetupTypeKind, Promise<SetupTypeRecord[]>>()

function endpointFor(kind: SetupTypeKind): string {
  return `/api/${kind}`
}

/** Sync read of in-memory cache (survives Account Type ↔ Cash Type navigation). */
export function getCachedSetupTypes(kind: SetupTypeKind): SetupTypeRecord[] | null {
  const cached = listCache.get(kind)
  return cached ? cached.map((r) => ({ ...r })) : null
}

export function setCachedSetupTypes(kind: SetupTypeKind, rows: SetupTypeRecord[]): void {
  listCache.set(
    kind,
    rows.map((r) => ({ ...r }))
  )
}

export function invalidateSetupTypesCache(kind?: SetupTypeKind): void {
  if (kind) {
    listCache.delete(kind)
    listInflight.delete(kind)
    return
  }
  listCache.clear()
  listInflight.clear()
}

/**
 * Load list for a setup page.
 * - Cache hit + !force → return cache, **no network** (no loading flash on page switch).
 * - Cache miss / force → fetch once (deduped if already inflight).
 */
export async function fetchSetupTypes(
  kind: SetupTypeKind,
  options?: { force?: boolean }
): Promise<SetupTypeRecord[]> {
  const force = options?.force === true

  if (!force) {
    const cached = listCache.get(kind)
    if (cached) {
      recordRequestDeduped(endpointFor(kind))
      return cached.map((r) => ({ ...r }))
    }
  }

  const existing = listInflight.get(kind)
  if (existing) {
    recordRequestDeduped(endpointFor(kind))
    return existing
  }

  const req = (async () => {
    const res = await fetch(endpointFor(kind), { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || `Failed to load ${kind}`)
    }
    const items = (data.items as SetupTypeRecord[]) ?? []
    listCache.set(kind, items)
    return items.map((r) => ({ ...r }))
  })()

  listInflight.set(kind, req)
  try {
    return await req
  } finally {
    if (listInflight.get(kind) === req) listInflight.delete(kind)
  }
}

export async function createSetupType(
  kind: SetupTypeKind,
  input: { name: string; code: string; description: string; active: boolean }
): Promise<SetupTypeRecord> {
  const res = await fetch(endpointFor(kind), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Failed to create ${kind}`)
  }
  const item = data.item as SetupTypeRecord
  const prev = listCache.get(kind) ?? []
  listCache.set(kind, [...prev, item])
  return item
}

export async function updateSetupType(
  kind: SetupTypeKind,
  id: string,
  input: { name: string; code: string; description: string; active: boolean }
): Promise<SetupTypeRecord> {
  const res = await fetch(`${endpointFor(kind)}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Failed to update ${kind}`)
  }
  const item = data.item as SetupTypeRecord
  const prev = listCache.get(kind) ?? []
  listCache.set(
    kind,
    prev.map((r) => (r.id === item.id ? item : r))
  )
  return item
}

export async function deleteSetupType(kind: SetupTypeKind, id: string): Promise<void> {
  const res = await fetch(`${endpointFor(kind)}/${id}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Failed to delete ${kind}`)
  }
  const prev = listCache.get(kind) ?? []
  listCache.set(
    kind,
    prev.filter((r) => r.id !== id)
  )
}
