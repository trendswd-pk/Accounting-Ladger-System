import { pad2, shiftYmd } from '@/lib/localDate'

/** Calendar windows for the Dashboard Expenses card (not rolling day counts). */
export type DashboardExpensePeriod =
  | 'all'
  | 'week'
  | 'month'
  | 'months_3'
  | 'months_6'
  | 'year'

export const DEFAULT_DASHBOARD_EXPENSE_PERIOD: DashboardExpensePeriod = 'all'

export const DASHBOARD_EXPENSE_PERIOD_OPTIONS: ReadonlyArray<{
  id: DashboardExpensePeriod
  label: string
}> = [
  { id: 'all', label: 'All time' },
  { id: 'week', label: 'Current week' },
  { id: 'month', label: 'Current month' },
  { id: 'months_3', label: 'Last 3 months' },
  { id: 'months_6', label: 'Last 6 months' },
  { id: 'year', label: 'Current year' },
]

const ALLOWED = new Set<string>(
  DASHBOARD_EXPENSE_PERIOD_OPTIONS.map((o) => o.id)
)

/** Map legacy day-count settings to calendar periods. */
function periodFromLegacyDays(days: number): DashboardExpensePeriod {
  if (!Number.isFinite(days) || days <= 0) return 'all'
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  if (days <= 100) return 'months_3'
  if (days <= 200) return 'months_6'
  return 'year'
}

export function normalizeDashboardExpensePeriod(
  value: unknown
): DashboardExpensePeriod {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase()
    if (ALLOWED.has(key)) return key as DashboardExpensePeriod
    // Older APIs may still send numeric strings.
    if (/^\d+$/.test(key)) return periodFromLegacyDays(Number(key))
  }
  if (typeof value === 'number') return periodFromLegacyDays(value)
  return DEFAULT_DASHBOARD_EXPENSE_PERIOD
}

export function dashboardExpensePeriodLabel(
  period: DashboardExpensePeriod | string | number
): string {
  const id = normalizeDashboardExpensePeriod(period)
  return (
    DASHBOARD_EXPENSE_PERIOD_OPTIONS.find((o) => o.id === id)?.label ??
    'All time'
  )
}

function firstDayOfMonth(year: number, monthIndex0: number): string {
  // monthIndex0 may be outside 0–11; normalize via UTC date math.
  const dt = new Date(Date.UTC(year, monthIndex0, 1))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-01`
}

/**
 * Inclusive calendar range ending at `todayYmd` (no future dates).
 * `null` = all time (use account balances).
 */
export function dashboardExpensePeriodRange(
  todayYmd: string,
  period: DashboardExpensePeriod | string | number
): { from: string; to: string } | null {
  const id = normalizeDashboardExpensePeriod(period)
  if (id === 'all') return null

  const y = Number(todayYmd.slice(0, 4))
  const m = Number(todayYmd.slice(5, 7)) // 1–12
  const d = Number(todayYmd.slice(8, 10))
  if (!y || !m || !d) return null

  if (id === 'week') {
    // Monday-start week (UTC calendar parts of the YMD — no TZ drift).
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const from = shiftYmd(todayYmd, mondayOffset)
    return { from, to: todayYmd }
  }

  if (id === 'month') {
    return { from: firstDayOfMonth(y, m - 1), to: todayYmd }
  }

  if (id === 'months_3') {
    // Current month + previous 2 (three calendar months).
    return { from: firstDayOfMonth(y, m - 1 - 2), to: todayYmd }
  }

  if (id === 'months_6') {
    return { from: firstDayOfMonth(y, m - 1 - 5), to: todayYmd }
  }

  // current year
  return { from: `${y}-01-01`, to: todayYmd }
}

/** @deprecated use dashboardExpensePeriodRange */
export function dashboardExpensePeriodFromYmd(
  todayYmd: string,
  period: DashboardExpensePeriod | string | number
): string | null {
  return dashboardExpensePeriodRange(todayYmd, period)?.from ?? null
}
