import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { AccountRecord } from '@/lib/accounts'
import { formatMoney } from '@/lib/money'
import type { TransactionRecord } from '@/lib/transactions'
import {
  listUploadedFiles,
  transactionAttachmentFolder,
  type FileAttachment,
} from '@/lib/uploads'

function stamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function safeFilePart(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'transaction'
  )
}

function formatDisplayDate(iso: string): string {
  const raw = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '—'
  const [y, m, d] = raw.split('-')
  return `${d}-${m}-${y}`
}

function proxyUrl(href: string): string {
  return `/api/branding/image?url=${encodeURIComponent(href)}`
}

async function fetchAttachmentBytes(publicUrl: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(proxyUrl(publicUrl), { cache: 'force-cache' })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

function isImageAttachment(file: FileAttachment): boolean {
  const mime = (file.mimeType || '').toLowerCase()
  const name = file.fileName.toLowerCase()
  return (
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp)$/i.test(name)
  )
}

function isPdfAttachment(file: FileAttachment): boolean {
  const mime = (file.mimeType || '').toLowerCase()
  return mime === 'application/pdf' || file.fileName.toLowerCase().endsWith('.pdf')
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Build first page(s): transaction details via jsPDF. */
async function buildDetailsPdfBytes(
  txn: TransactionRecord,
  opts: {
    currency: string
    businessName: string
    logoUrl?: string | null
    account?: AccountRecord | null
    runningBalance?: number
    documentCount: number
  }
): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 40
  const contentW = pageW - marginX * 2
  const brand: [number, number, number] = [37, 99, 235]
  const ink: [number, number, number] = [17, 24, 39]
  const muted: [number, number, number] = [100, 116, 139]
  const panel: [number, number, number] = [248, 250, 252]
  const line: [number, number, number] = [226, 232, 240]
  const barH = 58

  // Logo (optional)
  let logo: { dataUrl: string; width: number; height: number } | null = null
  const logoHref = String(opts.logoUrl ?? '').trim()
  if (logoHref) {
    try {
      const res = await fetch(proxyUrl(logoHref), { cache: 'force-cache' })
      if (res.ok) {
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        logo = await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            try {
              const natW = img.naturalWidth || 1
              const natH = img.naturalHeight || 1
              const canvas = document.createElement('canvas')
              canvas.width = natW
              canvas.height = natH
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                resolve(null)
                return
              }
              ctx.drawImage(img, 0, 0)
              const maxH = 34
              const maxW = 140
              const scale = Math.min(maxH / natH, maxW / natW, 1)
              resolve({
                dataUrl: canvas.toDataURL('image/png'),
                width: Math.max(12, natW * scale),
                height: Math.max(12, natH * scale),
              })
            } catch {
              resolve(null)
            } finally {
              URL.revokeObjectURL(objectUrl)
            }
          }
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            resolve(null)
          }
          img.src = objectUrl
        })
      }
    } catch {
      logo = null
    }
  }

  doc.setFillColor(...brand)
  doc.rect(0, 0, pageW, barH, 'F')

  if (logo) {
    try {
      doc.addImage(
        logo.dataUrl,
        'PNG',
        marginX,
        (barH - logo.height) / 2,
        logo.width,
        logo.height
      )
    } catch {
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(opts.businessName || 'Ledger', marginX, barH / 2 + 5)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(opts.businessName || 'Ledger', marginX, barH / 2 + 5)
  }

  const exported = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('TRANSACTION VOUCHER', pageW - marginX, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Exported ${exported}`, pageW - marginX, 40, { align: 'right' })

  const panelTop = barH + 14
  const panelH = 118
  doc.setFillColor(...panel)
  doc.setDrawColor(...line)
  doc.setLineWidth(0.6)
  doc.roundedRect(marginX, panelTop, contentW, panelH, 4, 4, 'FD')

  const amount = Math.abs(Number(txn.balance) || 0)
  const signed = txn.entryType === 'debit' ? -amount : amount
  const typeLabel =
    txn.entryType === 'debit' ? 'Debit (balance removed)' : 'Credit (balance added)'

  const rows: Array<[string, string]> = [
    ['Date', formatDisplayDate(txn.transactionDate)],
    ['SR. No.', String(txn.entryNumber)],
    ['Account', txn.accountName || '—'],
    ['Phone', opts.account?.phone || '—'],
    ['Type', typeLabel],
    ['Amount', formatMoney(signed, opts.currency)],
    [
      'Running balance',
      opts.runningBalance != null
        ? formatMoney(opts.runningBalance, opts.currency)
        : '—',
    ],
    ['Documents', String(opts.documentCount)],
  ]

  let y = panelTop + 16
  doc.setFontSize(9)
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...muted)
    doc.text(label, marginX + 12, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ink)
    const valueLines = doc.splitTextToSize(value, contentW - 130)
    doc.text(valueLines, marginX + 110, y)
    y += Math.max(14, valueLines.length * 11)
  }

  // Narration block
  let ny = panelTop + panelH + 18
  doc.setDrawColor(...brand)
  doc.setLineWidth(1.5)
  doc.line(marginX, ny, marginX + contentW, ny)
  ny += 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...ink)
  doc.text('Narration', marginX, ny)
  ny += 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...ink)
  const narration = txn.narration.trim() || '—'
  const narrLines = doc.splitTextToSize(narration, contentW)
  doc.text(narrLines, marginX, ny)
  ny += narrLines.length * 13 + 20

  if (opts.documentCount > 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...muted)
    doc.text(
      'Attached documents follow on the next page(s).',
      marginX,
      ny
    )
  }

  return doc.output('arraybuffer')
}

async function appendImagePage(
  pdf: PDFDocument,
  bytes: ArrayBuffer,
  fileName: string
): Promise<void> {
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margin = 40
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica)

  page.drawText('Attached document', {
    x: margin,
    y: height - 36,
    size: 11,
    font,
    color: rgb(0.15, 0.39, 0.92),
  })
  page.drawText(fileName.slice(0, 80), {
    x: margin,
    y: height - 52,
    size: 9,
    font: fontReg,
    color: rgb(0.4, 0.45, 0.55),
  })

  let image
  try {
    image = await pdf.embedPng(bytes)
  } catch {
    try {
      image = await pdf.embedJpg(bytes)
    } catch {
      page.drawText('Could not render this image in the PDF.', {
        x: margin,
        y: height / 2,
        size: 10,
        font: fontReg,
        color: rgb(0.7, 0.2, 0.2),
      })
      return
    }
  }

  const maxW = width - margin * 2
  const maxH = height - 80
  const scale = Math.min(maxW / image.width, maxH / image.height, 1)
  const drawW = image.width * scale
  const drawH = image.height * scale
  page.drawImage(image, {
    x: margin + (maxW - drawW) / 2,
    y: margin + (maxH - drawH) / 2,
    width: drawW,
    height: drawH,
  })
}

async function appendNotePage(
  pdf: PDFDocument,
  fileName: string,
  reason: string
): Promise<void> {
  const page = pdf.addPage([595.28, 841.89])
  const { height } = page.getSize()
  const margin = 40
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica)
  page.drawText('Attached document', {
    x: margin,
    y: height - 48,
    size: 12,
    font,
    color: rgb(0.15, 0.39, 0.92),
  })
  page.drawText(fileName.slice(0, 90), {
    x: margin,
    y: height - 72,
    size: 11,
    font: fontReg,
    color: rgb(0.07, 0.09, 0.15),
  })
  page.drawText(reason, {
    x: margin,
    y: height - 96,
    size: 10,
    font: fontReg,
    color: rgb(0.4, 0.45, 0.55),
  })
}

/**
 * PDF: page 1 = transaction details, then each uploaded document
 * (images embedded, PDFs merged, other types listed as note pages).
 */
export async function exportTransactionPdf(
  txn: TransactionRecord,
  opts: {
    currency: string
    businessName: string
    logoUrl?: string | null
    account?: AccountRecord | null
    runningBalance?: number
  }
): Promise<void> {
  const attachments = await listUploadedFiles(transactionAttachmentFolder(txn.id))
  const detailsBytes = await buildDetailsPdfBytes(txn, {
    ...opts,
    documentCount: attachments.length,
  })

  const finalPdf = await PDFDocument.create()
  const detailsPdf = await PDFDocument.load(detailsBytes)
  const detailPages = await finalPdf.copyPages(detailsPdf, detailsPdf.getPageIndices())
  for (const page of detailPages) finalPdf.addPage(page)

  for (const file of attachments) {
    const bytes = await fetchAttachmentBytes(file.publicUrl)
    if (!bytes) {
      await appendNotePage(
        finalPdf,
        file.fileName,
        'File could not be loaded for this export.'
      )
      continue
    }

    if (isPdfAttachment(file)) {
      try {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const pages = await finalPdf.copyPages(src, src.getPageIndices())
        for (const page of pages) finalPdf.addPage(page)
      } catch {
        await appendNotePage(
          finalPdf,
          file.fileName,
          'This PDF attachment could not be merged into the export.'
        )
      }
      continue
    }

    if (isImageAttachment(file)) {
      await appendImagePage(finalPdf, bytes, file.fileName)
      continue
    }

    await appendNotePage(
      finalPdf,
      file.fileName,
      'This file type is linked to the transaction but cannot be embedded for print. Open it from Documents in the app.'
    )
  }

  const out = await finalPdf.save()
  const blob = new Blob([new Uint8Array(out)], { type: 'application/pdf' })
  downloadBlob(
    `transaction-${txn.entryNumber}-${safeFilePart(txn.accountName)}-${stamp()}.pdf`,
    blob
  )
}
