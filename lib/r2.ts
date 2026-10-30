import { createHash, createHmac, randomUUID } from 'node:crypto'

/**
 * Minimal Cloudflare R2 client over the S3 API (same approach as Courier-Dashboard).
 * Server-only — never import from a client component.
 *
 * Preferred pattern: browser POSTs file to /api/uploads → server PUTs to R2 →
 * metadata saved in Supabase (avoids bucket CORS). Presigned PUT remains available.
 */

const REGION = 'auto'
const SERVICE = 's3'
const ALGORITHM = 'AWS4-HMAC-SHA256'

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicBaseUrl: string
  folderPrefix: string
}

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID || ''
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || ''
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || ''
  const bucket = process.env.R2_BUCKET_NAME || ''
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || ''

  const missing = [
    ['R2_ACCOUNT_ID', accountId],
    ['R2_ACCESS_KEY_ID', accessKeyId],
    ['R2_SECRET_ACCESS_KEY', secretAccessKey],
    ['R2_BUCKET_NAME', bucket],
    ['R2_PUBLIC_BASE_URL', publicBaseUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`Cloudflare R2 is not configured. Missing: ${missing.join(', ')}`)
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    folderPrefix: (process.env.R2_FOLDER_PREFIX || 'attachments').replace(/^\/+|\/+$/g, ''),
  }
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function encodeKeyPath(key: string): string {
  return key
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
      )
    )
    .join('/')
}

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-{2,}/g, '-')
  return cleaned.slice(0, 120).replace(/^[.-]+/, '') || 'file'
}

function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

function signingKey(secretAccessKey: string, dateStamp: string): Buffer {
  return hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), REGION), SERVICE),
    'aws4_request'
  )
}

function sanitizeFolder(folder: string): string {
  return folder
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/\/{2,}/g, '/')
    .slice(0, 80)
}

/** Object key under optional subfolder. UUID keeps public URLs unguessable. */
export function buildR2Key(cfg: R2Config, fileName: string, folder = ''): string {
  const root = cfg.folderPrefix ? `${cfg.folderPrefix}/` : ''
  const sub = sanitizeFolder(folder)
  const mid = sub ? `${sub}/` : ''
  return `${root}${mid}${randomUUID()}-${sanitizeFileName(fileName)}`
}

export function isKeyUnderPrefix(cfg: R2Config, key: string): boolean {
  if (!cfg.folderPrefix) return key.length > 0 && !key.startsWith('/')
  const expected = `${cfg.folderPrefix}/`
  return key.startsWith(expected) && key.length > expected.length
}

export function buildR2PublicUrl(cfg: R2Config, key: string): string {
  return `${cfg.publicBaseUrl}/${encodeKeyPath(key)}`
}

/** Presigned PUT so the browser uploads straight to R2 (bucket CORS required). */
export function createPresignedPutUrl(
  cfg: R2Config,
  key: string,
  contentType: string,
  expiresSec = 3600
): string {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`
  const canonicalUri = `/${cfg.bucket}/${encodeKeyPath(key)}`
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`
  const normalizedType = (contentType || 'application/octet-stream').trim()
  const signedHeaders = 'content-type;host'

  const queryEntries: [string, string][] = [
    ['X-Amz-Algorithm', ALGORITHM],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', `${cfg.accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresSec)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ]
  queryEntries.sort(([a], [b]) => a.localeCompare(b))

  const canonicalQueryString = queryEntries
    .map(([name, value]) => `${awsUriEncode(name)}=${awsUriEncode(value)}`)
    .join('&')

  const canonicalHeaders = `content-type:${normalizedType}\nhost:${host}\n`
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n')
  const signature = createHmac('sha256', signingKey(cfg.secretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex')

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

async function signedRequest(
  cfg: R2Config,
  method: 'PUT' | 'DELETE' | 'HEAD',
  key: string,
  body?: ArrayBuffer,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`
  const canonicalUri = `/${cfg.bucket}/${encodeKeyPath(key)}`
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  // Hashing multi‑MB bodies for SigV4 made proxy uploads feel stuck.
  // UNSIGNED-PAYLOAD matches our presigned PUT path and is accepted by R2.
  const payloadHash =
    method === 'PUT' && body && body.byteLength > 0
      ? 'UNSIGNED-PAYLOAD'
      : sha256Hex(body ? new Uint8Array(body) : '')

  const signedValues: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  for (const [name, value] of Object.entries(extraHeaders)) {
    signedValues[name.toLowerCase()] = value
  }

  const names = Object.keys(signedValues).sort()
  const canonicalHeaders = names.map((n) => `${n}:${signedValues[n].trim()}\n`).join('')
  const signedHeaders = names.join(';')
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n')
  const signature = createHmac('sha256', signingKey(cfg.secretAccessKey, dateStamp))
    .update(stringToSign, 'utf8')
    .digest('hex')

  const { host: _host, ...sentHeaders } = signedValues

  return fetch(`https://${host}${canonicalUri}`, {
    method,
    headers: {
      ...sentHeaders,
      Authorization: `${ALGORITHM} Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body,
  })
}

export async function putR2Object(
  cfg: R2Config,
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    const res = await signedRequest(cfg, 'PUT', key, body, {
      'content-type': (contentType || 'application/octet-stream').trim(),
    })
    if (!res.ok) {
      return `R2 upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`
    }
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'R2 upload failed.'
  }
}

export async function headR2Object(
  cfg: R2Config,
  key: string
): Promise<{ size: number; contentType: string } | null> {
  try {
    const res = await signedRequest(cfg, 'HEAD', key)
    if (!res.ok) return null
    return {
      size: Number(res.headers.get('content-length') ?? 0),
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    }
  } catch {
    return null
  }
}

export async function deleteR2Object(cfg: R2Config, key: string): Promise<string | null> {
  try {
    const res = await signedRequest(cfg, 'DELETE', key)
    if (!res.ok && res.status !== 404) {
      return `R2 delete failed (${res.status}): ${(await res.text()).slice(0, 200)}`
    }
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'R2 delete failed.'
  }
}

export { sanitizeFileName }
