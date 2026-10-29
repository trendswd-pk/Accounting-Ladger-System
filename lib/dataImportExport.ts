import { fetchAccounts, invalidateAccountsCache } from '@/lib/accounts'
import {
  cellAt,
  downloadTextFile,
  headerIndexMap,
  parseCsv,
  toCsv,
} from '@/lib/csv'
import { invalidateTransactionsCache } from '@/lib/transactions'

export const ACCOUNT_IMPORT_HEADERS = [
  'name',
  'phone',
  'account_type',
  'cash_type',
] as const

export const ACCOUNT_EXPORT_HEADERS = [
  'name',
  'phone',
  'account_type',
  'cash_type',
  'balance',
] as const

export const TRANSACTION_IO_HEADERS = [
  'transaction_date',
  'account_name',
  'narration',
  'entry_type',
  'amount',
] as const

/** Client chunk size — keeps each request fast and enables % progress. */
const CLIENT_CHUNK = 500

export type ImportProgress = {
  percent: number
  processed: number
  total: number
  imported: number
  skipped: number
  errorCount: number
}

export type ImportResult = {
  imported: number
  skipped: number
  errorCount: number
  errors: string[]
}

export function downloadAccountImportTemplate(): void {
  const csv = toCsv([...ACCOUNT_IMPORT_HEADERS], [
    ['Sample Shop', '03001234567', 'Cash in Hand', 'Cash in Hand'],
    ['Vendor Loan', '', 'Loan', 'Owned Cash'],
  ])
  downloadTextFile('accounts-import-template.csv', csv)
}

export function downloadTransactionImportTemplate(): void {
  const csv = toCsv([...TRANSACTION_IO_HEADERS], [
    ['2026-10-01', 'Sample Shop', 'Opening / purchase', 'credit', '1000'],
    ['2026-10-02', 'Sample Shop', 'Payment', 'debit', '200'],
  ])
  downloadTextFile('transactions-import-template.csv', csv)
}

async function postImportChunk(
  endpoint: string,
  rows: unknown[],
  lineOffset: number
): Promise<ImportResult & { processed: number }> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, lineOffset }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Import failed')
  return {
    imported: Number(data.imported) || 0,
    skipped: Number(data.skipped) || 0,
    errorCount: Number(data.errorCount) || 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
    processed: Number(data.processed) || rows.length,
  }
}

async function importInChunks<T>(
  endpoint: string,
  rows: T[],
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const total = rows.length
  let imported = 0
  let skipped = 0
  let errorCount = 0
  const errors: string[] = []

  onProgress?.({
    percent: 0,
    processed: 0,
    total,
    imported: 0,
    skipped: 0,
    errorCount: 0,
  })

  for (let i = 0; i < rows.length; i += CLIENT_CHUNK) {
    const chunk = rows.slice(i, i + CLIENT_CHUNK)
    const result = await postImportChunk(endpoint, chunk, i)
    imported += result.imported
    skipped += result.skipped
    errorCount += result.errorCount
    for (const err of result.errors) {
      if (errors.length < 40) errors.push(err)
    }
    const processed = Math.min(i + chunk.length, total)
    onProgress?.({
      percent: total === 0 ? 100 : Math.round((processed / total) * 100),
      processed,
      total,
      imported,
      skipped,
      errorCount,
    })
  }

  return { imported, skipped, errorCount, errors }
}

export async function importAccountsFromCsvFile(
  file: File,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const text = await file.text()
  const table = parseCsv(text)
  if (table.length < 2) throw new Error('CSV has no data rows.')
  const map = headerIndexMap(table[0])
  const rows = table.slice(1).map((row) => ({
    name: cellAt(row, map, 'name', 'account_name', 'account'),
    phone: cellAt(row, map, 'phone', 'mobile', 'contact'),
    accountType: cellAt(row, map, 'account_type', 'accounttype', 'acc_type', 'type'),
    cashType: cellAt(row, map, 'cash_type', 'cashtype', 'cash'),
  }))

  const result = await importInChunks('/api/accounts/import', rows, onProgress)
  invalidateAccountsCache()
  return result
}

export async function importTransactionsFromCsvFile(
  file: File,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const text = await file.text()
  const table = parseCsv(text)
  if (table.length < 2) throw new Error('CSV has no data rows.')
  const map = headerIndexMap(table[0])
  const rows = table.slice(1).map((row) => ({
    transactionDate: cellAt(row, map, 'transaction_date', 'date', 'txn_date'),
    accountName: cellAt(row, map, 'account_name', 'account', 'name'),
    accountId: cellAt(row, map, 'account_id', 'accountid'),
    narration: cellAt(row, map, 'narration', 'notes', 'description', 'memo'),
    entryType: cellAt(row, map, 'entry_type', 'type', 'debit_credit'),
    balance: cellAt(row, map, 'amount', 'balance', 'value'),
  }))

  const result = await importInChunks('/api/transactions/import', rows, onProgress)
  invalidateTransactionsCache()
  invalidateAccountsCache()
  return result
}

export async function exportAccountsCsv(): Promise<void> {
  const items = await fetchAccounts({ force: true })
  const csv = toCsv(
    [...ACCOUNT_EXPORT_HEADERS],
    items.map((a) => [
      a.name,
      a.phone,
      a.accountTypeName,
      a.cashTypeName,
      Number(a.balance) || 0,
    ])
  )
  const stamp = new Date().toISOString().slice(0, 10)
  downloadTextFile(`accounts-export-${stamp}.csv`, csv)
}

export async function exportTransactionsCsv(): Promise<void> {
  const res = await fetch('/api/transactions/export', { cache: 'no-store' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || 'Export failed')
  }
  const text = await res.text()
  const stamp = new Date().toISOString().slice(0, 10)
  downloadTextFile(`transactions-export-${stamp}.csv`, text)
}
