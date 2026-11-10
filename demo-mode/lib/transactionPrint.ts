/**
 * Open transaction print/preview reliably on mobile and desktop.
 * Nested action menus often lose the user-gesture for window.open on iOS/Android,
 * so narrow / coarse pointers navigate in the same tab.
 */
export function openTransactionPrintPreview(transactionId: string): void {
  const id = String(transactionId ?? '').trim()
  if (!id || typeof window === 'undefined') return

  const href = `/transactions/${encodeURIComponent(id)}/print`
  const preferSameTab =
    window.matchMedia('(max-width: 1023px)').matches ||
    window.matchMedia('(pointer: coarse)').matches

  if (preferSameTab) {
    window.location.assign(href)
    return
  }

  const popup = window.open(href, '_blank', 'noopener,noreferrer')
  if (!popup) {
    window.location.assign(href)
  }
}

/** Leave print preview: back if we navigated here; otherwise close the tab. */
export function leaveTransactionPrintPreview(transactionId?: string): void {
  if (typeof window === 'undefined') return

  if (window.history.length > 1) {
    window.history.back()
    return
  }

  window.close()

  // Popup close is ignored when this tab was not opened by script.
  const id = String(transactionId ?? '').trim()
  window.location.assign(
    id ? `/transactions/${encodeURIComponent(id)}` : '/transactions'
  )
}
