/**
 * Absolute public origin for Open Graph / absolute asset URLs.
 * Prefer NEXT_PUBLIC_APP_URL (or SITE_URL); fall back to Vercel host in deploy.
 */
export function siteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ''
  if (fromEnv) return fromEnv.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    return `https://${host}`
  }

  return 'http://localhost:3000'
}
