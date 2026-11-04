'use client'

import { useEffect, useState } from 'react'
import { localYmd, msUntilNextLocalMidnight, shiftYmd } from '@/lib/localDate'

export type LocalCalendarDay = {
  /** Local today YYYY-MM-DD — updates automatically at midnight. */
  todayYmd: string
  yesterdayYmd: string
}

/**
 * Keeps “today” / “yesterday” in sync with the browser calendar.
 * Schedules a timer for the next local midnight so open tabs roll over
 * without a manual refresh.
 */
export function useLocalCalendarDay(): LocalCalendarDay {
  const [todayYmd, setTodayYmd] = useState(() => localYmd())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const arm = () => {
      if (cancelled) return
      const next = localYmd()
      setTodayYmd((prev) => (prev === next ? prev : next))
      timer = setTimeout(() => {
        setTodayYmd(localYmd())
        arm()
      }, msUntilNextLocalMidnight())
    }

    arm()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setTodayYmd(localYmd())
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return {
    todayYmd,
    yesterdayYmd: shiftYmd(todayYmd, -1),
  }
}
