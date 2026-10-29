import type { AccountRecord } from '@/lib/accounts'

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

export function isCashInHandLabel(name: string, code: string): boolean {
  const n = normalizeName(name)
  const c = normalizeCode(code)
  return n === 'cash in hand' || c === 'CASH_IN_HAND' || c === 'CASHINHAND'
}

export function isSavingsLabel(name: string, code: string): boolean {
  const n = normalizeName(name)
  const c = normalizeCode(code)
  return n === 'savings' || c === 'SAVINGS'
}

export function isLoanLabel(name: string, code: string): boolean {
  const n = normalizeName(name)
  const c = normalizeCode(code)
  return n === 'loan' || c === 'LOAN'
}

/** Legacy name/code match when no Cash Types are configured in Settings. */
export function isLegacyCashSavingsAccount(account: AccountRecord): boolean {
  return (
    isCashInHandLabel(account.cashTypeName, account.cashTypeCode) ||
    isSavingsLabel(account.cashTypeName, account.cashTypeCode)
  )
}

export type CashSavingsFilter = {
  cashTypeIds?: string[]
  accountTypeIds?: string[]
}

/**
 * Cash & Savings: Account Type + Cash Type from Settings (AND when both set).
 * Falls back to Cash in Hand / Savings cash-type names when both lists are empty.
 */
export function isCashSavingsAccount(
  account: AccountRecord,
  filter: CashSavingsFilter | string[] = {}
): boolean {
  const opts: CashSavingsFilter = Array.isArray(filter)
    ? { cashTypeIds: filter }
    : filter
  const cashTypeIds = opts.cashTypeIds ?? []
  const accountTypeIds = opts.accountTypeIds ?? []

  if (cashTypeIds.length === 0 && accountTypeIds.length === 0) {
    return isLegacyCashSavingsAccount(account)
  }

  const cashOk =
    cashTypeIds.length === 0 || cashTypeIds.includes(account.cashTypeId)
  const accountOk =
    accountTypeIds.length === 0 || accountTypeIds.includes(account.accountTypeId)
  return cashOk && accountOk
}

export function defaultCashSavingsCashTypeIds(
  cashTypes: Array<{ id: string; name: string; code: string }>
): string[] {
  return cashTypes
    .filter(
      (t) =>
        isCashInHandLabel(t.name, t.code) || isSavingsLabel(t.name, t.code)
    )
    .map((t) => t.id)
}

export function defaultCashSavingsAccountTypeIds(
  accountTypes: Array<{ id: string; name: string; code: string }>
): string[] {
  return accountTypes
    .filter((t) => isCashInHandLabel(t.name, t.code))
    .map((t) => t.id)
}

export function isCashInPocketAccount(account: AccountRecord): boolean {
  return (
    isCashInHandLabel(account.accountTypeName, account.accountTypeCode) &&
    isCashInHandLabel(account.cashTypeName, account.cashTypeCode)
  )
}

export function isLoanAccount(account: AccountRecord): boolean {
  return isLoanLabel(account.accountTypeName, account.accountTypeCode)
}

/** Loan Acc Type with minus balance → Payable */
export function isPayableAccount(account: AccountRecord): boolean {
  return isLoanAccount(account) && (Number(account.balance) || 0) < 0
}

/** Loan Acc Type with plus balance → Receivable */
export function isReceivableAccount(account: AccountRecord): boolean {
  return isLoanAccount(account) && (Number(account.balance) || 0) > 0
}

export function isExpenseLabel(name: string, code: string): boolean {
  const n = normalizeName(name)
  const c = normalizeCode(code)
  return n === 'expense' || n === 'expenses' || c === 'EXPENSE' || c === 'EXPENSES'
}

export function isInvestLabel(name: string, code: string): boolean {
  const n = normalizeName(name)
  const c = normalizeCode(code)
  return (
    n === 'invest' ||
    n === 'investment' ||
    n === 'investments' ||
    c === 'INVEST' ||
    c === 'INVESTMENT' ||
    c === 'INVESTMENTS'
  )
}

/** Acc Type = Expense / Expenses */
export function isExpenseAccount(account: AccountRecord): boolean {
  return isExpenseLabel(account.accountTypeName, account.accountTypeCode)
}

/** Acc Type = Invest / Investment */
export function isInvestAccount(account: AccountRecord): boolean {
  return isInvestLabel(account.accountTypeName, account.accountTypeCode)
}
