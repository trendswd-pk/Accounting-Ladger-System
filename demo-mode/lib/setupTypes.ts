import { recordRequestDeduped } from '@/lib/requestProfiler'
import { requireDemoUser } from '@/lib/demoAuth'
import {
  getAccountTypes,
  getCashTypes,
  newId,
  setAccountTypes,
  setCashTypes,
} from '@/lib/demoStore'

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
  return `demo:${kind}`
}

function readList(kind: SetupTypeKind): SetupTypeRecord[] {
  requireDemoUser()
  return kind === 'account-types' ? getAccountTypes() : getCashTypes()
}

function writeList(kind: SetupTypeKind, rows: SetupTypeRecord[]): void {
  if (kind === 'account-types') setAccountTypes(rows)
  else setCashTypes(rows)
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

export async function fetchSetupTypes(
  kind: SetupTypeKind,
  options?: { force?: boolean }
): Promise<SetupTypeRecord[]> {
  const force = options?.force === true

  if (!force) {
    const cached = listCache.get(kind)
    if (cached) {
      return cached.map((r) => ({ ...r }))
    }
  }

  const existing = listInflight.get(kind)
  if (existing) {
    recordRequestDeduped(endpointFor(kind))
    return existing
  }

  const req = (async () => {
    const items = readList(kind)
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
  requireDemoUser()
  const name = String(input.name ?? '').trim()
  const code = String(input.code ?? '').trim().toUpperCase()
  const description = String(input.description ?? '').trim()
  const active = input.active !== false
  if (!name) throw new Error('Name is required.')
  if (!code) throw new Error('Code is required.')

  const prev = readList(kind)
  if (prev.some((r) => r.code === code)) {
    throw new Error('This code is already in use.')
  }

  const item: SetupTypeRecord = {
    id: newId(kind === 'account-types' ? 'at' : 'ct'),
    name,
    code,
    description,
    active,
    createdAt: new Date().toISOString(),
  }
  writeList(kind, [...prev, item])
  listCache.set(kind, [...prev, item])
  return item
}

export async function updateSetupType(
  kind: SetupTypeKind,
  id: string,
  input: { name: string; code: string; description: string; active: boolean }
): Promise<SetupTypeRecord> {
  requireDemoUser()
  const name = String(input.name ?? '').trim()
  const code = String(input.code ?? '').trim().toUpperCase()
  const description = String(input.description ?? '').trim()
  const active = input.active !== false
  if (!name) throw new Error('Name is required.')
  if (!code) throw new Error('Code is required.')

  const prev = readList(kind)
  const idx = prev.findIndex((r) => r.id === id)
  if (idx < 0) throw new Error('Not found.')
  if (prev.some((r) => r.code === code && r.id !== id)) {
    throw new Error('This code is already in use.')
  }

  const item: SetupTypeRecord = {
    ...prev[idx],
    name,
    code,
    description,
    active,
  }
  const next = [...prev]
  next[idx] = item
  writeList(kind, next)
  listCache.set(kind, next)
  return item
}

export async function deleteSetupType(kind: SetupTypeKind, id: string): Promise<void> {
  requireDemoUser()
  const next = readList(kind).filter((r) => r.id !== id)
  writeList(kind, next)
  listCache.set(kind, next)
}
