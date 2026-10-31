'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'

const SIZE = 48
const STROKE = 3.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Show after the user scrolls past this many px in the main pane. */
const SHOW_AFTER_PX = 160

type ScrollToTopButtonProps = {
  scrollRef: RefObject<HTMLElement | null>
  /** Re-bind listeners when the route changes (content height / scroll reset). */
  pathname?: string
}

/**
 * Fixed bottom-right control: scroll main pane to top.
 * Circular ring fills with scroll progress (0% → 100%).
 */
export default function ScrollToTopButton({ scrollRef, pathname }: ScrollToTopButtonProps) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setProgress(0)
      setVisible(false)
      return
    }
    const max = el.scrollHeight - el.clientHeight
    const p = max <= 0 ? 0 : Math.min(1, Math.max(0, el.scrollTop / max))
    setProgress(p)
    setVisible(el.scrollTop > SHOW_AFTER_PX)
  }, [scrollRef])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)

    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [scrollRef, pathname, measure])

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={`fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary-600 shadow-lg ring-1 ring-gray-200 transition-all duration-200 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-primary-400 dark:ring-gray-600 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900 lg:bottom-5 ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      <svg
        className="pointer-events-none absolute inset-0 -rotate-90"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-gray-200 dark:text-gray-600"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="text-primary-600 dark:text-primary-400 transition-[stroke-dashoffset] duration-100 ease-out"
        />
      </svg>
      <ArrowUp className="relative h-5 w-5" aria-hidden />
      <span className="sr-only">{Math.round(progress * 100)}% scrolled</span>
    </button>
  )
}
