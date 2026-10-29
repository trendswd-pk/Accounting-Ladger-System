/** Minimal CSV helpers for import/export (RFC4180-ish). */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const input = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    const next = input[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++
      row.push(cell.trim())
      cell = ''
      if (row.some((c) => c !== '')) rows.push(row)
      row = []
      continue
    }
    cell += ch
  }
  row.push(cell.trim())
  if (row.some((c) => c !== '')) rows.push(row)
  return rows
}

export function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ]
  return `${lines.join('\n')}\n`
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function headerIndexMap(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>()
  headerRow.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/\s+/g, '_')
    if (key) map.set(key, i)
  })
  return map
}

export function cellAt(row: string[], map: Map<string, number>, ...keys: string[]): string {
  for (const key of keys) {
    const idx = map.get(key)
    if (idx != null && row[idx] != null) return String(row[idx]).trim()
  }
  return ''
}
