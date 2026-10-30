/**
 * Client-side compression before upload — kept intentionally light.
 * Heavy multi-format / gzip-everything was making uploads feel stuck.
 */

const DEFAULT_MAX_EDGE = 1600
const DEFAULT_QUALITY = 0.78
/** Skip recompress when already a small JPEG/WebP. */
const SKIP_IMAGE_UNDER_BYTES = 450_000
/** Never gzip tiny files. */
const SKIP_GZIP_UNDER_BYTES = 48_000

function stemAndExt(fileName: string): { stem: string; ext: string } {
  const base = fileName.split(/[/\\]/).pop() || fileName
  const i = base.lastIndexOf('.')
  if (i <= 0) return { stem: base, ext: '' }
  return { stem: base.slice(0, i), ext: base.slice(i + 1).toLowerCase() }
}

/** Formats that are already compressed — gzip wastes CPU and rarely helps. */
const SKIP_GZIP_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'heic',
  'heif',
  'pdf',
  'zip',
  'gz',
  'tgz',
  'rar',
  '7z',
  'bz2',
  'xz',
  'mp3',
  'mp4',
  'mov',
  'webm',
  'm4a',
  'aac',
  'ogg',
  'opus',
  'docx',
  'xlsx',
  'pptx',
  'odt',
  'ods',
  'odp',
  'apk',
  'jar',
  'wasm',
  'br',
  'woff',
  'woff2',
])

function isSvgOrIco(file: File): boolean {
  const { ext } = stemAndExt(file.name)
  const t = (file.type || '').toLowerCase()
  return (
    ext === 'svg' ||
    ext === 'ico' ||
    t === 'image/svg+xml' ||
    t === 'image/x-icon' ||
    t === 'image/vnd.microsoft.icon'
  )
}

function isRasterImage(file: File): boolean {
  if (isSvgOrIco(file)) return false
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('image/')) return true
  const { ext } = stemAndExt(file.name)
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'tif', 'tiff'].includes(ext)
}

function shouldSkipGzip(file: File): boolean {
  if (file.size < SKIP_GZIP_UNDER_BYTES) return true
  const { ext } = stemAndExt(file.name)
  if (SKIP_GZIP_EXT.has(ext)) return true
  const t = (file.type || '').toLowerCase()
  if (
    t.startsWith('image/') ||
    t.startsWith('audio/') ||
    t.startsWith('video/') ||
    t === 'application/pdf' ||
    t === 'application/zip' ||
    t.includes('zip') ||
    t.includes('gzip')
  ) {
    return true
  }
  return false
}

function alreadySmallJpegOrWebp(file: File): boolean {
  if (file.size > SKIP_IMAGE_UNDER_BYTES) return false
  const { ext } = stemAndExt(file.name)
  const t = (file.type || '').toLowerCase()
  return (
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'webp' ||
    t === 'image/jpeg' ||
    t === 'image/webp'
  )
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image for compression.'))
    }
    img.src = url
  })
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
  fileName: string
): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality)
  })
  if (!blob || blob.size <= 0) return null
  return new File([blob], fileName, { type: mime, lastModified: Date.now() })
}

/** One encode pass (WebP, else JPEG) — not a multi-format bake-off. */
async function finalizeImageCanvas(
  canvas: HTMLCanvasElement,
  original: File,
  quality: number
): Promise<File> {
  const { stem } = stemAndExt(original.name)

  const webp = await canvasToFile(canvas, 'image/webp', quality, `${stem}.webp`)
  if (webp && webp.size < original.size * 0.97) return webp

  const jpeg = await canvasToFile(canvas, 'image/jpeg', quality, `${stem}.jpg`)
  if (jpeg && jpeg.size < original.size * 0.97) return jpeg

  return original
}

async function compressRasterImage(
  file: File,
  options: { maxEdge: number; quality: number }
): Promise<File> {
  let bitmap: ImageBitmap | null = null
  let width = 0
  let height = 0

  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file)
      width = bitmap.width
      height = bitmap.height
    }
  } catch {
    bitmap = null
  }

  const draw = async (
    source: CanvasImageSource,
    w: number,
    h: number
  ): Promise<File> => {
    const scale = Math.min(1, options.maxEdge / Math.max(w, h, 1))
    // Already within size budget and not oversized — skip canvas work.
    if (scale >= 1 && alreadySmallJpegOrWebp(file)) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(w * scale))
    canvas.height = Math.max(1, Math.round(h * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    return finalizeImageCanvas(canvas, file, options.quality)
  }

  if (!bitmap) {
    const img = await loadImageElement(file)
    width = img.naturalWidth || img.width
    height = img.naturalHeight || img.height
    return draw(img, width, height)
  }

  try {
    return await draw(bitmap, width, height)
  } finally {
    bitmap.close()
  }
}

async function gzipCompressFile(file: File): Promise<File | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const compressed = file.stream().pipeThrough(new CompressionStream('gzip'))
    const blob = await new Response(compressed).blob()
    if (blob.size <= 0) return null
    if (blob.size >= file.size * 0.92) return null
    const name = file.name.toLowerCase().endsWith('.gz') ? file.name : `${file.name}.gz`
    return new File([blob], name, {
      type: 'application/gzip',
      lastModified: Date.now(),
    })
  } catch {
    return null
  }
}

export type CompressUploadOptions = {
  /** Longest image edge in px (default 1600). */
  maxEdge?: number
  /** JPEG/WebP quality 0–1 (default 0.78). */
  quality?: number
  /** Skip compression entirely. */
  skip?: boolean
}

/**
 * Compress a file for upload. Safe for any type; returns original when
 * compression would not help (or would only burn CPU).
 */
export async function compressForUpload(
  file: File,
  options?: CompressUploadOptions
): Promise<File> {
  if (options?.skip) return file
  if (file.size <= 0) return file

  if (isRasterImage(file)) {
    if (alreadySmallJpegOrWebp(file)) return file
    try {
      return await compressRasterImage(file, {
        maxEdge: options?.maxEdge ?? DEFAULT_MAX_EDGE,
        quality: options?.quality ?? DEFAULT_QUALITY,
      })
    } catch {
      return file
    }
  }

  if (shouldSkipGzip(file)) return file
  const gz = await gzipCompressFile(file)
  return gz ?? file
}
