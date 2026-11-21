'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

export type PdfBlobPreviewHandle = {
  print: () => void
}

type Props = {
  blob: Blob
  title: string
  iframeId?: string
  className?: string
}

/** Desktop Chrome embeds PDFs in iframes; Android Chrome does not (shows broken Open UI). */
function browserCanEmbedPdf(): boolean {
  if (typeof navigator === 'undefined') return true
  if (typeof navigator.pdfViewerEnabled === 'boolean') {
    return navigator.pdfViewerEnabled
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 1023px)').matches
  return !(coarse || narrow)
}

async function renderPdfToContainer(
  blob: Blob,
  container: HTMLElement,
  signal: AbortSignal
): Promise<void> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const data = new Uint8Array(await blob.arrayBuffer())
  if (signal.aborted) return

  const doc = await pdfjs.getDocument({ data }).promise
  if (signal.aborted) {
    await doc.destroy()
    return
  }

  container.replaceChildren()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssWidth = Math.max(280, container.clientWidth || window.innerWidth - 24)

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    if (signal.aborted) break
    const page = await doc.getPage(pageNum)
    const base = page.getViewport({ scale: 1 })
    const scale = cssWidth / base.width
    const viewport = page.getViewport({ scale: scale * dpr })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
    canvas.style.height = `${Math.floor(viewport.height / dpr)}px`
    canvas.className = 'mx-auto mb-3 block max-w-full bg-white shadow-md'
    canvas.setAttribute('aria-label', `Page ${pageNum}`)

    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    await page.render({ canvasContext: ctx, viewport }).promise
    if (signal.aborted) break
    container.appendChild(canvas)
  }

  await doc.destroy()
}

function printRenderedPages(container: HTMLElement): void {
  const canvases = Array.from(container.querySelectorAll('canvas'))
  if (!canvases.length) {
    window.print()
    return
  }

  const images = canvases
    .map((canvas) => {
      const src = canvas.toDataURL('image/png')
      return `<img src="${src}" alt="" style="display:block;width:100%;max-width:100%;page-break-after:always;break-after:page;" />`
    })
    .join('')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    window.print()
    return
  }

  printWindow.document.open()
  printWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8" /><title>Print</title>
<style>@page{margin:10mm}html,body{margin:0;background:#fff}img{width:100%;height:auto}</style>
</head><body>${images}</body></html>`
  )
  printWindow.document.close()

  const trigger = () => {
    try {
      printWindow.focus()
      printWindow.print()
    } finally {
      window.setTimeout(() => {
        try {
          printWindow.close()
        } catch {
          /* ignore */
        }
      }, 400)
    }
  }

  if (printWindow.document.readyState === 'complete') {
    // Wait a tick so images decode.
    window.setTimeout(trigger, 250)
  } else {
    printWindow.onload = () => window.setTimeout(trigger, 250)
  }
}

/**
 * PDF preview that uses the native iframe viewer when available,
 * and falls back to PDF.js canvas pages on mobile browsers (e.g. Chrome Android).
 */
const PdfBlobPreview = forwardRef<PdfBlobPreviewHandle, Props>(
  function PdfBlobPreview(
    { blob, title, iframeId = 'txn-print-frame', className },
    ref
  ) {
    const [mode] = useState<'iframe' | 'canvas'>(() =>
      browserCanEmbedPdf() ? 'iframe' : 'canvas'
    )
    const [url, setUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [rendering, setRendering] = useState(false)
    const canvasHostRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(
      ref,
      () => ({
        print: () => {
          if (mode === 'iframe') {
            const frame = document.getElementById(
              iframeId
            ) as HTMLIFrameElement | null
            try {
              if (frame?.contentWindow) {
                frame.contentWindow.focus()
                frame.contentWindow.print()
                return
              }
            } catch {
              /* fall through */
            }
            window.print()
            return
          }
          if (canvasHostRef.current) {
            printRenderedPages(canvasHostRef.current)
          }
        },
      }),
      [mode, iframeId]
    )

    useEffect(() => {
      const objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }, [blob])

    useEffect(() => {
      if (mode !== 'canvas') return
      const host = canvasHostRef.current
      if (!host) return

      const ac = new AbortController()
      setError(null)
      setRendering(true)

      void renderPdfToContainer(blob, host, ac.signal)
        .catch((err) => {
          if (ac.signal.aborted) return
          setError(
            err instanceof Error ? err.message : 'Could not render PDF preview.'
          )
        })
        .finally(() => {
          if (!ac.signal.aborted) setRendering(false)
        })

      return () => {
        ac.abort()
        host.replaceChildren()
      }
    }, [mode, blob])

    if (mode === 'iframe' && url) {
      return (
        <iframe
          id={iframeId}
          title={title}
          src={url}
          className={
            className ?? 'h-full w-full border-0 bg-[#525659]'
          }
        />
      )
    }

    return (
      <div
        className={
          className ?? 'h-full w-full overflow-auto bg-[#525659] p-3'
        }
      >
        {rendering && !error ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-white/80">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white"
              aria-hidden
            />
            <p>Rendering preview…</p>
          </div>
        ) : null}
        {error ? (
          <div className="flex min-h-[40vh] items-center justify-center p-6 text-center text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <div
          ref={canvasHostRef}
          className={`mx-auto max-w-3xl ${rendering || error ? 'hidden' : ''}`}
        />
      </div>
    )
  }
)

export default PdfBlobPreview
