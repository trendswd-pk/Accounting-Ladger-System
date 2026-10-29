'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  getRequestProfilerSnapshot,
  initRequestProfiler,
  subscribeRequestProfiler,
} from '@/lib/requestProfiler'

type RequestProfilerPanelProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  externalTrigger?: boolean
}

export default function RequestProfilerPanel({
  open: openProp,
  onOpenChange,
  externalTrigger = false,
}: RequestProfilerPanelProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  useEffect(() => {
    initRequestProfiler()
  }, [])

  const snapshot = useSyncExternalStore(
    subscribeRequestProfiler,
    getRequestProfilerSnapshot,
    getRequestProfilerSnapshot
  )

  const rows = useMemo(
    () => [...snapshot.endpoints].sort((a, b) => b.calls - a.calls).slice(0, 14),
    [snapshot.endpoints]
  )

  if (process.env.NODE_ENV !== 'development') return null

  const panelPositionClass = externalTrigger
    ? 'fixed top-[4.25rem] right-3 z-[9999]'
    : 'fixed bottom-3 right-3 z-[9999]'

  return (
    <div className={panelPositionClass}>
      {!open && !externalTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          title="Open request profiler"
        >
          Req Profiler
        </button>
      ) : null}
      {open ? (
        <div className="w-[560px] max-w-[95vw] rounded-lg border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-600">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Request Profiler (dev)
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2 border-b border-gray-200 px-3 py-2 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-200">
            <span>Calls: {snapshot.totals.calls}</span>
            <span>OK: {snapshot.totals.ok}</span>
            <span>Failed: {snapshot.totals.failed}</span>
            <span>Cancelled: {snapshot.totals.cancelled}</span>
            <span>Deduped: {snapshot.totals.deduped}</span>
            <span>Inflight: {snapshot.totals.inflight}</span>
          </div>
          <div className="max-h-[48vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-1 text-left">Endpoint</th>
                  <th className="px-2 py-1 text-right">Calls</th>
                  <th className="px-2 py-1 text-right">OK</th>
                  <th className="px-2 py-1 text-right">Fail</th>
                  <th className="px-2 py-1 text-right">Cancel</th>
                  <th className="px-2 py-1 text-right">Deduped</th>
                  <th className="px-2 py-1 text-right">In</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.endpoint} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-1 font-mono text-[11px] text-gray-700 dark:text-gray-200">
                      {r.endpoint}
                    </td>
                    <td className="px-2 py-1 text-right">{r.calls}</td>
                    <td className="px-2 py-1 text-right">{r.ok}</td>
                    <td className="px-2 py-1 text-right">{r.failed}</td>
                    <td className="px-2 py-1 text-right">{r.cancelled}</td>
                    <td className="px-2 py-1 text-right">{r.deduped}</td>
                    <td className="px-2 py-1 text-right">{r.inflight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
