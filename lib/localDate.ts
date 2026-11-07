/** Local calendar helpers — never use toISOString() for business “today”. */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Display date: `05-Nov-2026`.
 * Accepts YYYY-MM-DD, ISO datetime, or Date. Invalid → `—` (or raw slice).
 */
export function formatDisplayDate(
  value: string | Date | null | undefined
): string {
  if (value == null || value === '') return '—'

  let y: number
  let m: number
  let d: number

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—'
    y = value.getFullYear()
    m = value.getMonth() + 1
    d = value.getDate()
  } else {
    const raw = String(value).trim()
    const ymd = raw.slice(0, 10)
    if (YMD_RE.test(ymd)) {
      y = Number(ymd.slice(0, 4))
      m = Number(ymd.slice(5, 7))
      d = Number(ymd.slice(8, 10))
    } else {
      const parsed = new Date(raw)
      if (Number.isNaN(parsed.getTime())) return raw || '—'
      y = parsed.getFullYear()
      m = parsed.getMonth() + 1
      d = parsed.getDate()
    }
  }

  if (m < 1 || m > 12 || d < 1 || d > 31) return '—'
  return `${pad2(d)}-${MONTH_SHORT[m - 1]}-${y}`
}

/** Display datetime: `05-Nov-2026, 5:18 PM`. */
export function formatDisplayDateTime(
  value: string | Date | null | undefined
): string {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return formatDisplayDate(value)

  const datePart = formatDisplayDate(date)
  let h = date.getHours()
  const min = pad2(date.getMinutes())
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${datePart}, ${h}:${min} ${ampm}`
}

/**
 * Live remaining time until an expiry instant.
 * Examples: `2d 4h 03m 12s left`, `45m 08s left`, `Expired`.
 */
export function formatRemainingCountdown(
  expiresAt: string | Date | null | undefined,
  now: Date | number = Date.now()
): string {
  if (expiresAt == null || expiresAt === '') return '—'
  const end =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : new Date(String(expiresAt)).getTime()
  if (Number.isNaN(end)) return '—'
  const nowMs = typeof now === 'number' ? now : now.getTime()
  const ms = end - nowMs
  if (ms <= 0) return 'Expired'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h ${pad2(m)}m ${pad2(s)}s left`
  if (h > 0) return `${h}h ${pad2(m)}m ${pad2(s)}s left`
  if (m > 0) return `${m}m ${pad2(s)}s left`
  return `${s}s left`
}

/** Browser / Node local calendar day as YYYY-MM-DD. */
export function localYmd(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * Calendar day in a named IANA zone (e.g. Asia/Karachi).
 * Used on the server when the client does not send `today`.
 */
export function ymdInTimeZone(
  date: Date = new Date(),
  timeZone = 'Asia/Karachi'
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !d) return localYmd(date)
  return `${y}-${m}-${d}`
}

export function isValidYmd(value: string): boolean {
  if (!YMD_RE.test(value)) return false
  const y = Number(value.slice(0, 4))
  const m = Number(value.slice(5, 7))
  const d = Number(value.slice(8, 10))
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  // Reject impossible days via UTC calendar check
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/** Shift a YYYY-MM-DD by whole calendar days (UTC date math — no TZ drift). */
export function shiftYmd(ymd: string, dayDelta: number): string {
  const y = Number(ymd.slice(0, 4))
  const m = Number(ymd.slice(5, 7))
  const d = Number(ymd.slice(8, 10))
  const dt = new Date(Date.UTC(y, m - 1, d + dayDelta))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

/** ms until next local midnight (+1s buffer so the clock is firmly on the new day). */
export function msUntilNextLocalMidnight(from: Date = new Date()): number {
  const next = new Date(from)
  next.setHours(24, 0, 0, 1)
  return Math.max(250, next.getTime() - from.getTime())
}
