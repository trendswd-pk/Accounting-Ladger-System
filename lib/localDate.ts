/** Local calendar helpers — never use toISOString() for business “today”. */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
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
