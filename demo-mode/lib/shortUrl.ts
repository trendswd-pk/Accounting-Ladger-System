import { getStoredShortLinks, setStoredShortLinks } from '@/lib/demoStore'

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
 */
export function fileAttachmentShareUrl(attachmentId: string): string {
  if (typeof window === 'undefined') return ''
  const id = String(attachmentId ?? '').trim()
  if (!id) return ''
  return `${window.location.origin}/l/f/${encodeURIComponent(id)}`
}

function makeCode(length = 7): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!
  }
  return out
}

export async function shortenUrl(longUrl: string): Promise<string> {
  const href = String(longUrl ?? '').trim()
  if (!isShareableHttpUrl(href)) return ''
  if (typeof window === 'undefined') return ''

  const existing = getStoredShortLinks().find((r) => r.targetUrl === href)
  const origin = window.location.origin
  if (existing) return `${origin}/l/${existing.code}`

  let code = makeCode()
  const rows = getStoredShortLinks()
  while (rows.some((r) => r.code === code)) code = makeCode()
  setStoredShortLinks([
    { code, targetUrl: href, createdAt: new Date().toISOString() },
    ...rows,
  ])
  return `${origin}/l/${code}`
}

/**
 * Fast share link (no extra shorten step): `{origin}/l/f/{attachmentId}`.
 */
export function shareUrlForAttachmentFast(attachment: {
  id: string
}): string {
  return fileAttachmentShareUrl(attachment.id)
}

export async function shareUrlForAttachment(attachment: {
  id: string
  publicUrl: string
}): Promise<string> {
  // Demo uploads are often data: URLs — file id path still works in-browser.
  const viaFile = fileAttachmentShareUrl(attachment.id)
  if (isShareableHttpUrl(attachment.publicUrl)) {
    const viaShort = await shortenUrl(attachment.publicUrl)
    if (viaShort) return viaShort
  }
  return viaFile
}
