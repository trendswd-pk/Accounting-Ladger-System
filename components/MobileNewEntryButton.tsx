'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState, type RefObject } from 'react'
import { Plus } from 'lucide-react'

/** Same short/form routes where Back to top is skipped (FAB / form chrome). */
const HIDE_ON =
  /^(?:\/(?:transactions|accounts)\/[^/]+(?:\/edit)?|\/accounts\/new|\/newentry|\/expenses\/(?:daily\/\d{4}-\d{2}-\d{2}|monthly\/\d{4}-\d{2})|\/settings\/(?:account-type|cash-type)(?:\/new|\/[^/]+(?:\/edit)?)|\/settings\/bank-details(?:\/new|\/[^/]+\/edit)|\/settings\/messages\/(?:account|transaction)-template)\/?$/

/** Match Back to top — raise FABs clear of the list pagination strip. */
const RAISE_AFTER_PROGRESS = 0.85

type MobileNewEntryButtonProps = {
  scrollRef?: RefObject<HTMLElement | null>
}

/**
 * Add Transaction FAB — docks just above the mobile bottom nav.
 * At ≥85% scroll, lifts above the mobile pagination row (Back to top stacks above it).
 */
export default function MobileNewEntryButton({ scrollRef }: MobileNewEntryButtonProps) {
  const pathname = usePathname() || '/'
  const [raised, setRaised] = useState(false)

  const measure = useCallback(() => {
    const el = scrollRef?.current
    if (el) {
      const max = el.scrollHeight - el.clientHeight
      const p = max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max))
      setRaised(p >= RAISE_AFTER_PROGRESS)
      return
    }
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const top = window.scrollY || doc.scrollTop
    const p = max <= 0 ? 0 : Math.min(1, Math.max(0, top / max))
    setRaised(p >= RAISE_AFTER_PROGRESS)
  }, [scrollRef])

  useEffect(() => {
    if (HIDE_ON.test(pathname)) return
    const el = scrollRef?.current
    measure()

    if (el) {
      el.addEventListener('scroll', measure, { passive: true })
      const ro = new ResizeObserver(() => measure())
      ro.observe(el)
      if (el.firstElementChild) ro.observe(el.firstElementChild)
      return () => {
        el.removeEventListener('scroll', measure)
        ro.disconnect()
      }
    }

    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(() => measure())
    ro.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [scrollRef, pathname, measure])

  if (HIDE_ON.test(pathname)) return null

  // 5rem clears bottom nav; +3.75rem clears ~50px pagination + gap when near page end.
  const bottomClass = raised
    ? 'bottom-[calc(8.75rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]'

  return (
    <Link
      href="/newentry"
      aria-label="Add transaction"
      title="Add transaction"
      className={`fixed z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg ring-1 ring-primary-600/20 transition-all duration-200 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 right-4 lg:hidden ${bottomClass}`}
    >
      <Plus className="h-6 w-6" strokeWidth={2.35} aria-hidden />
    </Link>
  )
}
