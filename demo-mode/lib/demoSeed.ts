import {
  DEFAULT_ACCOUNT_MESSAGE_TEMPLATE,
  DEFAULT_MESSAGE_NOTE_MINUS,
  DEFAULT_MESSAGE_NOTE_PLUS,
  DEFAULT_MESSAGE_NOTE_ZERO,
  DEFAULT_TRANSACTION_MESSAGE_TEMPLATE,
} from '@/lib/messageTemplates'
import type { AppSettings } from '@/lib/appSettings'
import type { SetupTypeRecord } from '@/lib/setupTypes'
import type { TransactionRecord } from '@/lib/transactions'
import {
  clearDemoUserData,
  isDemoSeeded,
  markDemoSeeded,
  setAccountTypes,
  setCashTypes,
  setStoredAccounts,
  setStoredSettings,
  setStoredTransactions,
  setStoredUploads,
  type StoredAccount,
} from '@/lib/demoStore'

/** Professional fictional advisory firm — PKR books for Northline Advisory. */
const BUSINESS_NAME = 'Northline Advisory'

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function typeRow(
  id: string,
  name: string,
  code: string,
  description: string,
  createdAt: string
): SetupTypeRecord {
  return {
    id,
    name,
    code,
    description,
    active: true,
    createdAt,
  }
}

export function buildNorthlineSeed(): {
  accountTypes: SetupTypeRecord[]
  cashTypes: SetupTypeRecord[]
  accounts: StoredAccount[]
  transactions: TransactionRecord[]
  settings: AppSettings
} {
  const base = new Date().toISOString()

  const accountTypes: SetupTypeRecord[] = [
    typeRow('at-cash', 'Cash in Hand', 'CASH_IN_HAND', 'Petty cash and till balances', base),
    typeRow('at-savings', 'Savings', 'SAVINGS', 'Bank and reserve savings', base),
    typeRow('at-loan', 'Loan', 'LOAN', 'Payable and receivable counterparties', base),
    typeRow('at-expense', 'Expense', 'EXPENSE', 'Operating and project expenses', base),
    typeRow('at-invest', 'Investment', 'INVESTMENT', 'Investments and placements', base),
  ]

  const cashTypes: SetupTypeRecord[] = [
    typeRow('ct-cash', 'Cash in Hand', 'CASH_IN_HAND', 'Physical cash on hand', base),
    typeRow('ct-savings', 'Savings', 'SAVINGS', 'Bank savings and deposits', base),
    typeRow('ct-owned', 'Owned Cash', 'OWNED_CASH', 'Business-owned working cash', base),
  ]

  const accounts: StoredAccount[] = [
    {
      id: 'acc-petty',
      name: 'Office Petty Cash',
      phone: '03001234001',
      accountTypeId: 'at-cash',
      cashTypeId: 'ct-cash',
      createdAt: base,
    },
    {
      id: 'acc-hbl',
      name: 'HBL Business Savings',
      phone: '',
      accountTypeId: 'at-savings',
      cashTypeId: 'ct-savings',
      createdAt: base,
    },
    {
      id: 'acc-client-a',
      name: 'Horizon Retail Ltd',
      phone: '03215550101',
      accountTypeId: 'at-loan',
      cashTypeId: 'ct-owned',
      createdAt: base,
    },
    {
      id: 'acc-vendor',
      name: 'BrightPrint Supplies',
      phone: '03335550202',
      accountTypeId: 'at-loan',
      cashTypeId: 'ct-owned',
      createdAt: base,
    },
    {
      id: 'acc-rent',
      name: 'Office Rent',
      phone: '',
      accountTypeId: 'at-expense',
      cashTypeId: 'ct-owned',
      createdAt: base,
    },
    {
      id: 'acc-travel',
      name: 'Client Travel',
      phone: '',
      accountTypeId: 'at-expense',
      cashTypeId: 'ct-cash',
      createdAt: base,
    },
    {
      id: 'acc-naya',
      name: 'Naya Pakistan Certificates',
      phone: '',
      accountTypeId: 'at-invest',
      cashTypeId: 'ct-savings',
      createdAt: base,
    },
  ]

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Account'

  const txDefs: Array<{
    id: string
    daysAgo: number
    accountId: string
    narration: string
    entryType: 'credit' | 'debit'
    balance: number
  }> = [
    {
      id: 'tx-01',
      daysAgo: 28,
      accountId: 'acc-hbl',
      narration: 'Opening balance — business savings',
      entryType: 'credit',
      balance: 850000,
    },
    {
      id: 'tx-02',
      daysAgo: 25,
      accountId: 'acc-petty',
      narration: 'Cash float for office expenses',
      entryType: 'credit',
      balance: 45000,
    },
    {
      id: 'tx-03',
      daysAgo: 22,
      accountId: 'acc-client-a',
      narration: 'Advisory retainer — Invoice #INV-1042',
      entryType: 'credit',
      balance: 175000,
    },
    {
      id: 'tx-04',
      daysAgo: 18,
      accountId: 'acc-rent',
      narration: 'Monthly office rent — Gulberg suite',
      entryType: 'credit',
      balance: 120000,
    },
    {
      id: 'tx-05',
      daysAgo: 14,
      accountId: 'acc-vendor',
      narration: 'Printing & stationery purchase',
      entryType: 'debit',
      balance: 28500,
    },
    {
      id: 'tx-06',
      daysAgo: 10,
      accountId: 'acc-travel',
      narration: 'Islamabad client site visit',
      entryType: 'credit',
      balance: 18500,
    },
    {
      id: 'tx-07',
      daysAgo: 7,
      accountId: 'acc-client-a',
      narration: 'Partial collection — INV-1042',
      entryType: 'debit',
      balance: 75000,
    },
    {
      id: 'tx-08',
      daysAgo: 5,
      accountId: 'acc-naya',
      narration: 'Placement in savings certificates',
      entryType: 'credit',
      balance: 200000,
    },
    {
      id: 'tx-09',
      daysAgo: 2,
      accountId: 'acc-rent',
      narration: 'Utilities share — electricity',
      entryType: 'credit',
      balance: 14200,
    },
    {
      id: 'tx-10',
      daysAgo: 0,
      accountId: 'acc-travel',
      narration: 'Local courier and meeting refreshments',
      entryType: 'credit',
      balance: 3200,
    },
  ]

  const transactions: TransactionRecord[] = txDefs.map((t, index) => ({
    id: t.id,
    entryNumber: index + 1,
    transactionDate: isoDaysAgo(t.daysAgo),
    accountId: t.accountId,
    accountName: accountName(t.accountId),
    narration: t.narration,
    entryType: t.entryType,
    balance: t.balance,
    createdAt: base,
  }))

  const settings: AppSettings = {
    businessName: BUSINESS_NAME,
    currency: 'PKR',
    theme: 'dark',
    defaultEntryMode: 'normal',
    logoUrl: null,
    faviconUrl: null,
    accountMessageTemplate: DEFAULT_ACCOUNT_MESSAGE_TEMPLATE,
    transactionMessageTemplate: DEFAULT_TRANSACTION_MESSAGE_TEMPLATE,
    messageNotePlus: DEFAULT_MESSAGE_NOTE_PLUS,
    messageNoteMinus: DEFAULT_MESSAGE_NOTE_MINUS,
    messageNoteZero: DEFAULT_MESSAGE_NOTE_ZERO,
    accountMessageIncludeLedgerUrl: true,
    transactionMessageIncludePdfUrl: true,
    transactionMessageIncludeLedgerUrl: true,
    cashSavingsCashTypeIds: ['ct-cash', 'ct-savings'],
    cashSavingsAccountTypeIds: ['at-cash', 'at-savings'],
    payableReceivableCashTypeIds: ['ct-owned'],
    payableReceivableAccountTypeIds: ['at-loan'],
    updatedAt: base,
  }

  return { accountTypes, cashTypes, accounts, transactions, settings }
}

/** Seed once per user sandbox (first login). */
export function ensureDemoSeeded(userId: string): void {
  if (typeof window === 'undefined') return
  if (isDemoSeeded(userId)) return
  applySeed(userId)
}

/** Clear sandbox and re-apply Northline Advisory seed. */
export function resetDemoData(userId: string): void {
  if (typeof window === 'undefined') return
  clearDemoUserData(userId)
  applySeed(userId)
}

function applySeed(userId: string): void {
  const seed = buildNorthlineSeed()
  setAccountTypes(seed.accountTypes, userId)
  setCashTypes(seed.cashTypes, userId)
  setStoredAccounts(seed.accounts, userId)
  setStoredTransactions(seed.transactions, userId)
  setStoredSettings(seed.settings, userId)
  setStoredUploads([], userId)
  markDemoSeeded(userId)
  // Warm settings cache so header shows Northline Advisory, not "My Business".
  void import('@/lib/appSettings').then(({ invalidateAppSettingsCache, fetchAppSettings }) => {
    invalidateAppSettingsCache()
    void fetchAppSettings().catch(() => {})
  })
}
