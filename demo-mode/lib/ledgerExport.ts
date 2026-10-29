import { csvEscape, toCsv, downloadTextFile } from '@/lib/csv'
import { formatMoney } from '@/lib/money'
import {
  fetchTransactions,
  signedTransactionAmount,
  type TransactionRecord,
} from '@/lib/transactions'
import type { AccountRecord } from '@/lib/accounts'

export type LedgerExportFormat = 'pdf' | 'csv' | 'excel'

export type LedgerLine = {
  date: string
  entryNumber: number
  narration: string
  entryType: string
  amount: number
  signedAmount: number
  runningBalance: number
}

function stamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function safeFilePart(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'account'
}

function formatDisplayDate(iso: string): string {
  const raw = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '—'
  const [y, m, d] = raw.split('-')
  return `${d}-${m}-${y}`
}

/** Chronological ledger lines with running balance for one account. */
export function buildAccountLedgerLines(txns: TransactionRecord[]): LedgerLine[] {
  const sorted = [...txns].sort((a, b) => {
    const byDate = a.transactionDate.localeCompare(b.transactionDate)
    if (byDate !== 0) return byDate
    return a.entryNumber - b.entryNumber
  })
  let running = 0
  return sorted.map((row) => {
    const signed = signedTransactionAmount(row)
    running += signed
    return {
      date: row.transactionDate,
      entryNumber: row.entryNumber,
      narration: row.narration || '',
      entryType: row.entryType === 'debit' ? 'Debit' : 'Credit',
      amount: Math.abs(Number(row.balance) || 0),
      signedAmount: signed,
      runningBalance: running,
    }
  })
}

export async function loadAccountLedgerLines(accountId: string): Promise<LedgerLine[]> {
  const all = await fetchTransactions()
  return buildAccountLedgerLines(all.filter((t) => t.accountId === accountId))
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportAccountLedgerCsv(
  account: AccountRecord,
  opts: { currency: string; businessName: string; excelFriendly?: boolean }
): Promise<void> {
  const lines = await loadAccountLedgerLines(account.id)
  const headers = [
    'date',
    'entry_no',
    'narration',
    'type',
    'amount',
    'running_balance',
  ]
  const rows = lines.map((l) => [
    formatDisplayDate(l.date),
    l.entryNumber,
    l.narration,
    l.entryType,
    l.signedAmount,
    l.runningBalance,
  ])
  const meta = [
    ['Business', opts.businessName],
    ['Account', account.name],
    ['Phone', account.phone || ''],
    ['Account type', account.accountTypeName || ''],
    ['Cash type', account.cashTypeName || ''],
    ['Currency', opts.currency],
    ['Closing balance', account.balance],
    ['Exported on', new Date().toISOString().slice(0, 10)],
    [],
  ]
  const csvBody = toCsv(headers, rows)
  const metaCsv = meta
    .map((r) => r.map((c) => csvEscape(c as string | number)).join(','))
    .join('\n')
  const content = `${metaCsv}\n${csvBody}`
  const bom = opts.excelFriendly ? '\uFEFF' : ''
  const base = `ledger-${safeFilePart(account.name)}-${stamp()}`
  downloadTextFile(`${base}.csv`, `${bom}${content}`, 'text/csv;charset=utf-8')
}

type PdfLogo = { dataUrl: string; width: number; height: number }

/** Load settings logo for jsPDF (demo data URLs or remote URLs). */
async function loadLogoForPdf(url: string | null | undefined): Promise<PdfLogo | null> {
  const href = String(url ?? '').trim()
  if (!href || typeof window === 'undefined') return null

  try {
    const res = await fetch(href)
    if (!res.ok) return null
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)

    return await new Promise((resolve) => {
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
  } catch {
    return null
  }
}

function drawLedgerPdfHeader(
  doc: InstanceType<typeof import('jspdf').jsPDF>,
  account: AccountRecord,
  opts: {
    currency: string
    businessName: string
    entryCount: number
    logo?: PdfLogo | null
  }
): number {
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 40
  const contentW = pageW - marginX * 2
  const brand: [number, number, number] = [37, 99, 235]
  const ink: [number, number, number] = [17, 24, 39]
  const muted: [number, number, number] = [100, 116, 139]
  const panel: [number, number, number] = [248, 250, 252]
  const line: [number, number, number] = [226, 232, 240]
  const barH = 58

  // Brand bar
  doc.setFillColor(...brand)
  doc.rect(0, 0, pageW, barH, 'F')

  // Left: logo (or business name fallback)
  if (opts.logo) {
    const logoX = marginX
    const logoY = (barH - opts.logo.height) / 2
    try {
      doc.addImage(opts.logo.dataUrl, 'PNG', logoX, logoY, opts.logo.width, opts.logo.height)
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

  // Right corner: title + export date
  const exported = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ACCOUNT LEDGER', pageW - marginX, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Exported ${exported}`, pageW - marginX, 40, { align: 'right' })

  // Meta panel (no separate title row)
  const panelTop = barH + 14
  const panelH = 68
  doc.setFillColor(...panel)
  doc.setDrawColor(...line)
  doc.setLineWidth(0.6)
  doc.roundedRect(marginX, panelTop, contentW, panelH, 4, 4, 'FD')

  const metaRows: Array<[[string, string], [string, string]]> = [
    [
      ['Name', account.name || '—'],
      ['Phone', account.phone || '—'],
    ],
    [
      ['Currency', opts.currency || '—'],
      ['Closing balance', formatMoney(account.balance, opts.currency)],
    ],
    [
      ['Account type', account.accountTypeName || '—'],
      ['Entries', String(opts.entryCount)],
    ],
    [
      ['Cash type', account.cashTypeName || '—'],
      ['Document', 'Ledger statement'],
    ],
  ]

  const col1X = marginX + 12
  const col2X = marginX + contentW / 2 + 8
  const labelW = 78
  let rowY = panelTop + 15
  doc.setFontSize(8)
  for (const [left, right] of metaRows) {
    const [lLabel, lValue] = left
    const [rLabel, rValue] = right
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...muted)
    doc.text(lLabel, col1X, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ink)
    doc.text(lValue, col1X + labelW, rowY)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...muted)
    doc.text(rLabel, col2X, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ink)
    doc.text(rValue, col2X + labelW, rowY)
    rowY += 13
  }

  // Divider before table
  let y = panelTop + panelH + 14
  doc.setDrawColor(...brand)
  doc.setLineWidth(1.5)
  doc.line(marginX, y, marginX + contentW, y)
  doc.setDrawColor(...line)
  doc.setLineWidth(0.5)
  doc.line(marginX, y + 3, marginX + contentW, y + 3)

  return y + 12
}

export async function exportAccountLedgerPdf(
  account: AccountRecord,
  opts: { currency: string; businessName: string; logoUrl?: string | null }
): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableMod.default
  const [lines, logo] = await Promise.all([
    loadAccountLedgerLines(account.id),
    loadLogoForPdf(opts.logoUrl),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const marginX = 40
  const startY = drawLedgerPdfHeader(doc, account, {
    currency: opts.currency,
    businessName: opts.businessName,
    entryCount: lines.length,
    logo,
  })

  const dataRows = lines.map((l) => [
    formatDisplayDate(l.date),
    String(l.entryNumber),
    l.narration || '—',
    l.entryType,
    formatMoney(l.signedAmount, opts.currency),
    formatMoney(l.runningBalance, opts.currency),
  ])
  const spacerRowIndex = dataRows.length
  const closingRowIndex = dataRows.length + 1
  const body = [
    ...dataRows,
    ['', '', '', '', '', ''], // gap before closing
    [
      '',
      '',
      'Closing balance',
      '',
      '',
      formatMoney(account.balance, opts.currency),
    ],
  ]

  autoTable(doc, {
    startY,
    head: [['Date', 'No.', 'Narration', 'Type', 'Amount', 'Balance']],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 32 },
      3: { cellWidth: 48, fontStyle: 'bold' },
      4: { cellWidth: 78, halign: 'right' },
      5: { cellWidth: 78, halign: 'right' },
    },
    margin: { left: marginX, right: marginX, top: 48 },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const rowIndex = data.row.index

      if (rowIndex === spacerRowIndex) {
        data.cell.styles.minCellHeight = 18
        data.cell.styles.cellPadding = 8
        data.cell.styles.fillColor = [255, 255, 255]
        data.cell.styles.lineWidth = 0
        data.cell.styles.textColor = [255, 255, 255]
        return
      }

      if (rowIndex === closingRowIndex) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fontSize = 9
        data.cell.styles.fillColor = [239, 246, 255]
        data.cell.styles.textColor = [30, 64, 175]
        data.cell.styles.lineColor = [191, 219, 254]
        data.cell.styles.lineWidth = 0.6
        data.cell.styles.cellPadding = 7
        if (data.column.index === 2 || data.column.index === 5) {
          data.cell.styles.halign = data.column.index === 5 ? 'right' : 'left'
        }
        return
      }

      if (data.column.index === 3) {
        const raw = String(data.cell.raw ?? '').toLowerCase()
        if (raw.includes('credit')) {
          data.cell.styles.textColor = [22, 163, 74]
        } else if (raw.includes('debit')) {
          data.cell.styles.textColor = [220, 38, 38]
        }
      }
    },
    didDrawPage: (data) => {
      // Repeat slim brand strip on continuation pages
      if ((data.pageNumber ?? 1) > 1) {
        const pageW = doc.internal.pageSize.getWidth()
        doc.setFillColor(37, 99, 235)
        doc.rect(0, 0, pageW, 28, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(
          `${opts.businessName || 'Ledger'}  ·  ${account.name}`,
          marginX,
          18
        )
        doc.setFont('helvetica', 'normal')
        doc.text(`Page ${data.pageNumber}`, pageW - marginX, 18, {
          align: 'right',
        })
      }
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `${opts.businessName || 'Ledger'} — Confidential ledger export`,
      marginX,
      pageH - 18
    )
    doc.text(`Page ${i} of ${pageCount}`, pageW - marginX, pageH - 18, {
      align: 'right',
    })
  }

  const blob = doc.output('blob')
  downloadBlob(`ledger-${safeFilePart(account.name)}-${stamp()}.pdf`, blob)
}

export async function exportAccountLedger(
  account: AccountRecord,
  format: LedgerExportFormat,
  opts: { currency: string; businessName: string; logoUrl?: string | null }
): Promise<void> {
  if (format === 'pdf') {
    await exportAccountLedgerPdf(account, opts)
    return
  }
  await exportAccountLedgerCsv(account, {
    ...opts,
    excelFriendly: format === 'excel' || format === 'csv',
  })
}
