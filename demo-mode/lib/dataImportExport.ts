import {
  createAccount,
  fetchAccounts,
  invalidateAccountsCache,
} from '@/lib/accounts'
import {
  cellAt,
  downloadTextFile,
  headerIndexMap,
  parseCsv,
  toCsv,
} from '@/lib/csv'
import {
  createTransaction,
  fetchTransactions,
  invalidateTransactionsCache,
  normalizeEntryType,
} from '@/lib/transactions'
import { fetchSetupTypes } from '@/lib/setupTypes'

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

  const accountTypes = await fetchSetupTypes('account-types')
  const cashTypes = await fetchSetupTypes('cash-types')
  const findType = (
    list: Array<{ id: string; name: string; code: string }>,
    label: string
  ) => {
    const n = label.trim().toLowerCase()
    const c = label.trim().toUpperCase().replace(/[\s-]+/g, '_')
    return list.find(
      (t) => t.name.toLowerCase() === n || t.code.toUpperCase() === c
    )
  }

  const total = rows.length
  let imported = 0
  let skipped = 0
  let errorCount = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      if (!row.name.trim()) {
        skipped++
      } else {
        const at = findType(accountTypes, row.accountType)
        const ct = findType(cashTypes, row.cashType)
        if (!at || !ct) {
          errorCount++
          if (errors.length < 40) {
            errors.push(`Row ${i + 2}: unknown account or cash type.`)
          }
        } else {
          await createAccount({
            name: row.name.trim(),
            phone: row.phone.trim(),
            accountTypeId: at.id,
            cashTypeId: ct.id,
          })
          imported++
        }
      }
    } catch (err) {
      errorCount++
      if (errors.length < 40) {
        errors.push(
          `Row ${i + 2}: ${err instanceof Error ? err.message : 'Import failed'}`
        )
      }
    }
    onProgress?.({
      percent: total === 0 ? 100 : Math.round(((i + 1) / total) * 100),
      processed: i + 1,
      total,
      imported,
      skipped,
      errorCount,
    })
  }

  invalidateAccountsCache()
  return { imported, skipped, errorCount, errors }
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

  const accounts = await fetchAccounts({ force: true })
  const findAccount = (name: string, id: string) => {
    if (id.trim()) return accounts.find((a) => a.id === id.trim())
    const n = name.trim().toLowerCase()
    return accounts.find((a) => a.name.toLowerCase() === n)
  }

  const total = rows.length
  let imported = 0
  let skipped = 0
  let errorCount = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const account = findAccount(row.accountName, row.accountId)
      if (!account) {
        errorCount++
        if (errors.length < 40) errors.push(`Row ${i + 2}: account not found.`)
      } else if (!row.transactionDate.trim() || !row.narration.trim()) {
        skipped++
      } else {
        await createTransaction({
          transactionDate: row.transactionDate.trim().slice(0, 10),
          accountId: account.id,
          narration: row.narration.trim(),
          entryType: normalizeEntryType(row.entryType.trim().toLowerCase()),
          balance: Math.abs(Number(row.balance) || 0),
        })
        imported++
      }
    } catch (err) {
      errorCount++
      if (errors.length < 40) {
        errors.push(
          `Row ${i + 2}: ${err instanceof Error ? err.message : 'Import failed'}`
        )
      }
    }
    onProgress?.({
      percent: total === 0 ? 100 : Math.round(((i + 1) / total) * 100),
      processed: i + 1,
      total,
      imported,
      skipped,
      errorCount,
    })
  }

  invalidateTransactionsCache()
  invalidateAccountsCache()
  return { imported, skipped, errorCount, errors }
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
  const items = await fetchTransactions({ force: true })
  const csv = toCsv(
    [...TRANSACTION_IO_HEADERS],
    items.map((t) => [
      t.transactionDate,
      t.accountName,
      t.narration,
      t.entryType,
      Number(t.balance) || 0,
    ])
  )
  const stamp = new Date().toISOString().slice(0, 10)
  downloadTextFile(`transactions-export-${stamp}.csv`, csv)
}
