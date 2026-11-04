'use client'

type Props = {
  open: boolean
  percent: number
  label?: string
}

/** In-app progress while WhatsApp message (and PDFs) are prepared. */
export function WhatsAppPrepOverlay({
  open,
  percent,
  label = 'Preparing message…',
}: Props) {
  if (!open) return null
  const p = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Preparing WhatsApp message"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div
          className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600"
          aria-hidden
        />
        <h2 className="text-center text-base font-semibold text-gray-900 dark:text-gray-50">
          Opening WhatsApp
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-300">
          {label}
        </p>
        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-950/40"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-500 transition-[width] duration-300 ease-out"
            style={{ width: `${p}%` }}
          />
        </div>
        <p className="mt-3 text-center text-lg font-semibold tabular-nums text-primary-700 dark:text-primary-400">
          {p}%
        </p>
      </div>
    </div>
  )
}
