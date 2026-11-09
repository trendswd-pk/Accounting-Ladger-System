'use client'

import type { ReactNode } from 'react'
import { Layers, Tag } from 'lucide-react'

type SetupTypeMobileCardProps = {
  name: string
  code: string
  description?: string
  active: boolean
  /** e.g. "3 accounts" */
  metaRight?: string
  actions?: ReactNode
  onOpen: () => void
}

/**
 * Mobile setup-type card — brand-sky / brand-ink language
 * (parity with AccountMobileCard / Expenses).
 */
export default function SetupTypeMobileCard({
  name,
  code,
  description,
  active,
  metaRight,
  actions,
  onOpen,
}: SetupTypeMobileCardProps) {
  const desc = (description ?? '').trim()

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="relative cursor-pointer overflow-hidden rounded-[1.65rem] bg-brand-sky text-left shadow-[0_8px_24px_rgba(11,27,51,0.18)] outline-none ring-1 ring-white/35 transition-transform active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
    >
      <div className="relative h-11 w-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.28)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 360 44"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect width="360" height="44" className="fill-brand-ink" />
          <path
            d="M0 0 H118 C152 0 158 44 198 44 H0 Z"
            className="fill-brand-sky"
          />
        </svg>

        <div className="relative z-10 flex h-full items-center justify-between gap-2 px-4">
          <p className="inline-flex min-w-0 items-center gap-1.5 truncate text-[12px] font-semibold tracking-wide text-white">
            <Tag className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
            <span className="truncate uppercase tabular-nums">{code}</span>
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              active
                ? 'bg-primary-500/25 text-white'
                : 'bg-white/15 text-white/70'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="relative px-4 pb-3.5 pt-1.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="truncate text-[1.125rem] font-bold leading-snug tracking-tight text-brand-ink">
              {name}
            </h2>
            {desc ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-brand-ink/65">
                {desc}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-brand-ink/10 pt-2.5 text-[12px] font-medium text-brand-ink">
          <p className="inline-flex min-w-0 items-center gap-1 truncate">
            <Layers className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2.5} aria-hidden />
            <span className="truncate opacity-70">Linked accounts</span>
          </p>
          <p className="shrink-0 font-semibold tabular-nums text-brand-ink">
            {metaRight ?? '—'}
          </p>
        </div>
      </div>
    </article>
  )
}
