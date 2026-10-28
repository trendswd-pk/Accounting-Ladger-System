import { DEFAULT_APP_SETTINGS } from '@/lib/appSettings'

/**
 * Professional money label: currency code before amount (e.g. "PKR 1,234").
 * Uses Intl when the code is a valid ISO 4217 currency.
 */
export function formatMoney(
  amount: number,
  currency: string = DEFAULT_APP_SETTINGS.currency
): string {
  const num = Number(amount)
  const safe = Number.isFinite(num) ? num : 0
  const code = String(currency || DEFAULT_APP_SETTINGS.currency).trim().toUpperCase() || 'PKR'

  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'code',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safe)
  } catch {
    const formatted = safe.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    return `${code} ${formatted}`
  }
}
