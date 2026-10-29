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

export type AccountTypeCashTypeFilter = {
  cashTypeIds?: string[]
  accountTypeIds?: string[]
}

/** @deprecated use AccountTypeCashTypeFilter */
export type CashSavingsFilter = AccountTypeCashTypeFilter

export function matchesAccountOrCashType(
  account: AccountRecord,
  filter: AccountTypeCashTypeFilter = {}
): boolean {
  const cashTypeIds = filter.cashTypeIds ?? []
  const accountTypeIds = filter.accountTypeIds ?? []
  if (cashTypeIds.length === 0 && accountTypeIds.length === 0) return false
  const cashMatch =
    cashTypeIds.length > 0 && cashTypeIds.includes(account.cashTypeId)
  const accountMatch =
    accountTypeIds.length > 0 && accountTypeIds.includes(account.accountTypeId)
  return cashMatch || accountMatch
}

/**
 * Cash & Savings: Account Type or Cash Type from Settings (OR — match either).
 * Falls back to Cash in Hand / Savings cash-type names when both lists are empty.
 */
export function isCashSavingsAccount(
  account: AccountRecord,
  filter: AccountTypeCashTypeFilter | string[] = {}
): boolean {
  const opts: AccountTypeCashTypeFilter = Array.isArray(filter)
    ? { cashTypeIds: filter }
    : filter
  const cashTypeIds = opts.cashTypeIds ?? []
  const accountTypeIds = opts.accountTypeIds ?? []

  if (cashTypeIds.length === 0 && accountTypeIds.length === 0) {
    return isLegacyCashSavingsAccount(account)
  }

  return matchesAccountOrCashType(account, opts)
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

export function defaultLoanAccountTypeIds(
  accountTypes: Array<{ id: string; name: string; code: string }>
): string[] {
  return accountTypes.filter((t) => isLoanLabel(t.name, t.code)).map((t) => t.id)
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

/** Loan Acc Type with minus balance → Payable (legacy when Settings empty). */
export function isLegacyPayableAccount(account: AccountRecord): boolean {
  return isLoanAccount(account) && (Number(account.balance) || 0) < 0
}

/** Loan Acc Type with plus balance → Receivable (legacy when Settings empty). */
export function isLegacyReceivableAccount(account: AccountRecord): boolean {
  return isLoanAccount(account) && (Number(account.balance) || 0) > 0
}

/**
 * Payable: Settings Account/Cash Type match (OR) + negative balance.
 * Falls back to Loan + minus balance when both lists are empty.
 */
export function isPayableAccount(
  account: AccountRecord,
  filter: AccountTypeCashTypeFilter = {}
): boolean {
  const cashTypeIds = filter.cashTypeIds ?? []
  const accountTypeIds = filter.accountTypeIds ?? []
  const balance = Number(account.balance) || 0
  if (cashTypeIds.length === 0 && accountTypeIds.length === 0) {
    return isLegacyPayableAccount(account)
  }
  return matchesAccountOrCashType(account, filter) && balance < 0
}

/**
 * Receivable: Settings Account/Cash Type match (OR) + positive balance.
 * Falls back to Loan + plus balance when both lists are empty.
 */
export function isReceivableAccount(
  account: AccountRecord,
  filter: AccountTypeCashTypeFilter = {}
): boolean {
  const cashTypeIds = filter.cashTypeIds ?? []
  const accountTypeIds = filter.accountTypeIds ?? []
  const balance = Number(account.balance) || 0
  if (cashTypeIds.length === 0 && accountTypeIds.length === 0) {
    return isLegacyReceivableAccount(account)
  }
  return matchesAccountOrCashType(account, filter) && balance > 0
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
