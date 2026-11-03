'use client'

type ExpenseTotalMobileBarProps = {
  /** Shown on the dark header (right), e.g. "Month Expenses" */
  label: string
  amountLabel?: string
  amount: number
  formatBalance: (n: number) => string
  amountToneClass: string
}

/**
 * Mobile month/year expense total - brand-sky bar matching period cards.
 */
export default function ExpenseTotalMobileBar({
  label,
  amountLabel = 'Expense',
  amount,
  formatBalance,
  amountToneClass,
}: ExpenseTotalMobileBarProps) {
  const amountText = formatBalance(amount)

  return (
    <div className="relative overflow-hidden rounded-[1.65rem] bg-brand-sky text-left shadow-[0_8px_24px_rgba(11,27,51,0.18)]">
      <div className="relative h-9 w-full">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 360 36"
          preserveAspectRatio="none"
          aria-hidden
        >
          <rect width="360" height="36" className="fill-brand-ink" />
          <path
            d="M0 0 H100 C132 0 138 36 176 36 H0 Z"
            className="fill-brand-sky"
          />
        </svg>
        <div className="relative z-10 flex h-full items-center justify-end px-4">
          <p className="min-w-0 truncate text-[12px] font-semibold tracking-wide text-white">
            {label}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12px] font-medium text-brand-ink">
        <p className="min-w-0 truncate text-[13px] font-bold tracking-tight">Total</p>
        <p className={`min-w-0 shrink-0 text-right ${amountToneClass}`}>
          <span className="opacity-70 text-brand-ink">{amountLabel} :</span>{' '}
          <span className="text-sm font-bold tabular-nums">{amountText}</span>
        </p>
      </div>
    </div>
  )
}
