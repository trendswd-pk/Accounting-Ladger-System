/**
 * @deprecated In-app WhatsAppPrepOverlay is used instead of a second tab.
 * Kept so old imports do not break during deploys; always returns null.
 */

export type WhatsAppPrepHandle = {
  win: Window
  setProgress: (percent: number, label?: string) => void
  goToUrl: (url: string) => void
  close: () => void
}

/** No-op — loading stays in the same window via WhatsAppPrepOverlay. */
export function openWhatsAppPrepTab(
  _initialLabel = 'Preparing message…'
): WhatsAppPrepHandle | null {
  return null
}
