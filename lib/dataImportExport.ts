import { invalidateAccountsCache } from '@/lib/accounts'
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

export const TRANSACTION_IO_HEADERS = [
  'transaction_date',
  'account_name',
  'narration',
  'entry_type',
  'amount',
] as const

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

export async function importAccountsFromCsvFile(file: File): Promise<{
  imported: number
  skipped: number
  errorCount: number
  errors: string[]
}> {
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

  const res = await fetch('/api/accounts/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Account import failed')
  invalidateAccountsCache()
  return {
    imported: Number(data.imported) || 0,
    skipped: Number(data.skipped) || 0,
    errorCount: Number(data.errorCount) || 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  }
}

export async function importTransactionsFromCsvFile(file: File): Promise<{
  imported: number
  skipped: number
  errorCount: number
  errors: string[]
}> {
  const text = await file.text()
  const table = parseCsv(text)
  if (table.length < 2) throw new Error('CSV has no data rows.')
  const map = headerIndexMap(table[0])
  const rows = table.slice(1).map((row) => ({
    transactionDate: cellAt(
      row,
      map,
      'transaction_date',
      'date',
      'txn_date'
    ),
    accountName: cellAt(row, map, 'account_name', 'account', 'name'),
    accountId: cellAt(row, map, 'account_id', 'accountid'),
    narration: cellAt(row, map, 'narration', 'notes', 'description', 'memo'),
    entryType: cellAt(row, map, 'entry_type', 'type', 'debit_credit'),
    balance: cellAt(row, map, 'amount', 'balance', 'value'),
  }))

  const res = await fetch('/api/transactions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Transaction import failed')
  invalidateTransactionsCache()
  invalidateAccountsCache()
  return {
    imported: Number(data.imported) || 0,
    skipped: Number(data.skipped) || 0,
    errorCount: Number(data.errorCount) || 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  }
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
