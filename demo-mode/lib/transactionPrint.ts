/**
 * Open transaction print/preview in the same tab.
 *
 * Note: `window.open(url, '_blank', 'noopener')` returns `null` even when the
 * tab opens, which previously also ran `location.assign` and loaded preview
 * in both the new tab and the current tab.
 */
export function openTransactionPrintPreview(transactionId: string): void {
  const id = String(transactionId ?? '').trim()
  if (!id || typeof window === 'undefined') return

  window.location.assign(`/transactions/${encodeURIComponent(id)}/print`)
}

/** Leave print preview: back if we navigated here; otherwise go to the transaction. */
export function leaveTransactionPrintPreview(transactionId?: string): void {
  if (typeof window === 'undefined') return

  if (window.history.length > 1) {
    window.history.back()
    return
  }

  const id = String(transactionId ?? '').trim()
  window.location.assign(
    id ? `/transactions/${encodeURIComponent(id)}` : '/transactions'
  )
}
