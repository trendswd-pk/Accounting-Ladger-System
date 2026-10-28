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

export function isCashSavingsAccount(account: AccountRecord): boolean {
  return (
    isCashInHandLabel(account.cashTypeName, account.cashTypeCode) ||
    isSavingsLabel(account.cashTypeName, account.cashTypeCode)
  )
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
