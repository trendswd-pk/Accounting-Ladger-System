function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** True when the URL can be opened outside the app (WhatsApp-safe). */
export function isShareableHttpUrl(url: string): boolean {
  const href = String(url ?? '').trim()
  return Boolean(href) && isHttpUrl(href) && !href.startsWith('data:')
}

/**
 * Ad-free share URL for a saved file attachment: `{origin}/l/f/{id}`.
 * Works without the short_links table (uses file_attachments redirect).
 */
export function fileAttachmentShareUrl(attachmentId: string): string {
  if (typeof window === 'undefined') return ''
  const id = String(attachmentId ?? '').trim()
  if (!id) return ''
  return `${window.location.origin}/l/f/${encodeURIComponent(id)}`
}

/**
 * Optional prettier short code via `/api/shorten` → `{origin}/l/{code}`.
 * Returns empty string on failure (never returns the long R2 URL).
 */
export async function shortenUrl(longUrl: string): Promise<string> {
  const href = String(longUrl ?? '').trim()
  if (!isShareableHttpUrl(href)) return ''

  try {
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: href }),
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { shortUrl?: string }
    const short = String(data.shortUrl ?? '').trim()
    if (!isShareableHttpUrl(short)) return ''
    if (short === href) return ''
    if (short.includes('/l/') || short.length < Math.min(href.length, 80)) {
      return short
    }
  } catch {
    /* no short link */
  }
  return ''
}

/**
 * Best share link for a ledger PDF attachment:
 * prefer /l/{code} when short_links works, else /l/f/{attachmentId}.
 */
export async function shareUrlForAttachment(attachment: {
  id: string
  publicUrl: string
}): Promise<string> {
  const viaFile = fileAttachmentShareUrl(attachment.id)
  const viaShort = await shortenUrl(attachment.publicUrl)
  if (viaShort) return viaShort
  return viaFile
}
