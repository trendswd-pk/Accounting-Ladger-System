/** Shared password rules for Profile change + Forgot/Reset flows (web + Capacitor). */

export const MIN_PASSWORD_LENGTH = 8

export const AUTH_INPUT_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

export function validateNewPasswordPair(
  newPassword: string,
  confirmPassword: string
): string | null {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (newPassword !== confirmPassword) {
    return 'New password and confirmation do not match.'
  }
  return null
}

/** Browser origin for Supabase email redirects (works for web + Capacitor WebView). */
export function authRedirectOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}
