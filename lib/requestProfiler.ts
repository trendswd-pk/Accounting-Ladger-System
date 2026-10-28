type EndpointStats = {
  endpoint: string
  calls: number
  ok: number
  failed: number
  cancelled: number
  deduped: number
  inflight: number
}

type ProfilerState = {
  installed: boolean
  totals: Omit<EndpointStats, 'endpoint'>
  endpoints: Record<string, EndpointStats>
}

type ProfilerSnapshot = {
  totals: Omit<EndpointStats, 'endpoint'>
  endpoints: EndpointStats[]
}

const state: ProfilerState = {
  installed: false,
  totals: { calls: 0, ok: 0, failed: 0, cancelled: 0, deduped: 0, inflight: 0 },
  endpoints: {},
}

const listeners = new Set<() => void>()
let notifyQueued = false
let snapshot: ProfilerSnapshot = {
  totals: { ...state.totals },
  endpoints: [],
}

function rebuildSnapshot() {
  snapshot = {
    totals: { ...state.totals },
    endpoints: Object.values(state.endpoints).map((x) => ({ ...x })),
  }
}

function queueNotify() {
  if (notifyQueued) return
  notifyQueued = true
  queueMicrotask(() => {
    notifyQueued = false
    rebuildSnapshot()
    listeners.forEach((fn) => fn())
  })
}

function getOrCreate(endpoint: string): EndpointStats {
  const existing = state.endpoints[endpoint]
  if (existing) return existing
  const created: EndpointStats = {
    endpoint,
    calls: 0,
    ok: 0,
    failed: 0,
    cancelled: 0,
    deduped: 0,
    inflight: 0,
  }
  state.endpoints[endpoint] = created
  return created
}

function endpointFromInput(input: RequestInfo | URL): string {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    const url = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')

    if (url.hostname.endsWith('supabase.co')) {
      const rpcMatch = url.pathname.match(/\/rest\/v1\/rpc\/([^/]+)/)
      if (rpcMatch) return `supabase:rpc/${rpcMatch[1]}`
      const tableMatch = url.pathname.match(/\/rest\/v1\/([^/]+)/)
      if (tableMatch) return `supabase:rest/${tableMatch[1]}`
      if (url.pathname.includes('/storage/v1/')) return 'supabase:storage'
    }

    if (url.origin === (typeof window !== 'undefined' ? window.location.origin : url.origin)) {
      return url.pathname
    }
    return `${url.host}${url.pathname}`
  } catch {
    return 'unknown'
  }
}

function isAbortLike(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; message?: string }
  return (
    e.name === 'AbortError' ||
    (typeof e.message === 'string' && /aborted|AbortError|signal/i.test(e.message))
  )
}

/** Dev-only: patch window.fetch to count network calls (API + Supabase). */
export function initRequestProfiler(): void {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'development') return
  if (state.installed) return
  state.installed = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const endpoint = endpointFromInput(input)
    const row = getOrCreate(endpoint)
    row.calls += 1
    row.inflight += 1
    state.totals.calls += 1
    state.totals.inflight += 1
    queueNotify()

    try {
      const res = await originalFetch(input, init)
      row.ok += 1
      state.totals.ok += 1
      return res
    } catch (err) {
      if (isAbortLike(err)) {
        row.cancelled += 1
        state.totals.cancelled += 1
      } else {
        row.failed += 1
        state.totals.failed += 1
      }
      throw err
    } finally {
      row.inflight = Math.max(0, row.inflight - 1)
      state.totals.inflight = Math.max(0, state.totals.inflight - 1)
      queueNotify()
    }
  }
}

/** Count a shared inflight promise that avoided a second network hop. */
export function recordRequestDeduped(endpoint: string): void {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'development') return
  const row = getOrCreate(endpoint)
  row.deduped += 1
  state.totals.deduped += 1
  queueNotify()
}

export function subscribeRequestProfiler(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getRequestProfilerSnapshot() {
  return snapshot
}
