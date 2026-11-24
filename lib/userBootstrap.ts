import { DEFAULT_APP_SETTINGS } from '@/lib/appSettings'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Default Account Types for every new ledger. */
export const DEFAULT_ACCOUNT_TYPES = [
  { name: 'Cash in Hand', code: 'CIH', description: 'Physical cash held by the business' },
  { name: 'Bank', code: 'BNK', description: 'Bank current and savings accounts' },
  { name: 'Expenses', code: 'EXP', description: 'Operating and other expenses' },
  { name: 'Savings', code: 'SAV', description: 'Saved funds and reserves' },
  { name: 'Investment', code: 'INV', description: 'Investments and portfolios' },
] as const

/** Default Cash Types for every new ledger. */
export const DEFAULT_CASH_TYPES = [
  { name: 'Cash in Hand', code: 'CIH', description: 'Cash available in hand / pocket' },
  { name: 'Expenses', code: 'EXP', description: 'Cash used for expenses' },
  { name: 'Owned Cash', code: 'OWN', description: 'Owned / business cash balance' },
  { name: 'Savings', code: 'SAV', description: 'Saved cash' },
  { name: 'Investment', code: 'INV', description: 'Cash tied in investments' },
] as const

type TypeRow = { id: string; code: string }

export type BootstrapResult = {
  created: boolean
  businessName: string
}

function normalizeBusinessName(raw?: string | null): string {
  return String(raw ?? '').trim()
}

function byCode(rows: TypeRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of rows) {
    map.set(String(row.code).toUpperCase(), row.id)
  }
  return map
}

async function ensureDefaultTypes(userId: string): Promise<{
  accountTypes: Map<string, string>
  cashTypes: Map<string, string>
}> {
  const admin = getSupabaseAdmin()

  const [{ data: existingAccountTypes, error: atListErr }, { data: existingCashTypes, error: ctListErr }] =
    await Promise.all([
      admin.from('account_types').select('id, code').eq('user_id', userId),
      admin.from('cash_types').select('id, code').eq('user_id', userId),
    ])
  if (atListErr) throw new Error(atListErr.message)
  if (ctListErr) throw new Error(ctListErr.message)

  const haveAt = new Set(
    ((existingAccountTypes ?? []) as TypeRow[]).map((r) => String(r.code).toUpperCase())
  )
  const haveCt = new Set(
    ((existingCashTypes ?? []) as TypeRow[]).map((r) => String(r.code).toUpperCase())
  )

  const missingAt = DEFAULT_ACCOUNT_TYPES.filter((row) => !haveAt.has(row.code))
  if (missingAt.length > 0) {
    const { error } = await admin.from('account_types').insert(
      missingAt.map((row) => ({
        ...row,
        active: true,
        user_id: userId,
      }))
    )
    if (error && error.code !== '23505') throw new Error(error.message)
  }

  const missingCt = DEFAULT_CASH_TYPES.filter((row) => !haveCt.has(row.code))
  if (missingCt.length > 0) {
    const { error } = await admin.from('cash_types').insert(
      missingCt.map((row) => ({
        ...row,
        active: true,
        user_id: userId,
      }))
    )
    if (error && error.code !== '23505') throw new Error(error.message)
  }

  const [{ data: accountTypeRows, error: atErr }, { data: cashTypeRows, error: ctErr }] =
    await Promise.all([
      admin.from('account_types').select('id, code').eq('user_id', userId),
      admin.from('cash_types').select('id, code').eq('user_id', userId),
    ])
  if (atErr) throw new Error(atErr.message)
  if (ctErr) throw new Error(ctErr.message)

  return {
    accountTypes: byCode((accountTypeRows ?? []) as TypeRow[]),
    cashTypes: byCode((cashTypeRows ?? []) as TypeRow[]),
  }
}

async function ensureDummyBank(userId: string, businessName: string): Promise<void> {
  const admin = getSupabaseAdmin()
  const { count, error: countError } = await admin
    .from('bank_details')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) throw new Error(countError.message)
  if (count) return

  const { error } = await admin.from('bank_details').insert({
    user_id: userId,
    bank_name: 'Demo Bank',
    account_title: businessName || 'Business Account',
    account_number: '0001234567890',
    iban: 'PK00DEMO0000000001234567890',
    branch_name: 'Main Branch',
    branch_code: '0001',
    swift_code: 'DEMOPKKA',
    notes: 'Sample bank detail — edit or replace in Settings → Bank details.',
    active: true,
  })
  if (error && error.code !== '23505') throw new Error(error.message)
}

async function ensureStarterAccounts(
  userId: string,
  accountTypes: Map<string, string>,
  cashTypes: Map<string, string>
): Promise<void> {
  const admin = getSupabaseAdmin()
  const { count, error: countError } = await admin
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) throw new Error(countError.message)
  if (count) return

  const requireId = (map: Map<string, string>, code: string, label: string) => {
    const id = map.get(code)
    if (!id) throw new Error(`Missing default ${label} type code ${code}.`)
    return id
  }

  const starters = [
    {
      name: 'Cash in Pocket',
      phone: '',
      account_type_id: requireId(accountTypes, 'CIH', 'account'),
      cash_type_id: requireId(cashTypes, 'CIH', 'cash'),
    },
    {
      name: 'Bank Account',
      phone: '',
      account_type_id: requireId(accountTypes, 'BNK', 'account'),
      cash_type_id: requireId(cashTypes, 'OWN', 'cash'),
    },
    {
      name: 'Savings',
      phone: '',
      account_type_id: requireId(accountTypes, 'SAV', 'account'),
      cash_type_id: requireId(cashTypes, 'SAV', 'cash'),
    },
    {
      name: 'Investment',
      phone: '',
      account_type_id: requireId(accountTypes, 'INV', 'account'),
      cash_type_id: requireId(cashTypes, 'INV', 'cash'),
    },
    {
      name: 'Daily Expenses',
      phone: '',
      account_type_id: requireId(accountTypes, 'EXP', 'account'),
      cash_type_id: requireId(cashTypes, 'EXP', 'cash'),
    },
    {
      name: 'Loan Payable',
      phone: '',
      account_type_id: requireId(accountTypes, 'BNK', 'account'),
      cash_type_id: requireId(cashTypes, 'OWN', 'cash'),
    },
    {
      name: 'Loan Receivable',
      phone: '',
      account_type_id: requireId(accountTypes, 'CIH', 'account'),
      cash_type_id: requireId(cashTypes, 'OWN', 'cash'),
    },
  ]

  const { error } = await admin.from('accounts').insert(
    starters.map((row) => ({ ...row, user_id: userId }))
  )
  if (error && error.code !== '23505') throw new Error(error.message)
}

/**
 * Idempotent first-login / signup seed: settings, default types, dummy bank,
 * and starter accounts for this user only.
 */
export async function bootstrapUserLedger(
  userId: string,
  businessNameRaw?: string | null
): Promise<BootstrapResult> {
  const admin = getSupabaseAdmin()
  const requestedName = normalizeBusinessName(businessNameRaw)

  const { data: existing, error: existingError } = await admin
    .from('app_settings')
    .select('id, business_name')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)

  let created = false
  let businessName =
    requestedName ||
    normalizeBusinessName(existing?.business_name) ||
    DEFAULT_APP_SETTINGS.businessName

  if (existing) {
    const stored = normalizeBusinessName(existing.business_name)
    const isPlaceholder =
      !stored || stored.toLowerCase() === DEFAULT_APP_SETTINGS.businessName.toLowerCase()
    if (requestedName && isPlaceholder && requestedName !== stored) {
      const { error: updateError } = await admin
        .from('app_settings')
        .update({
          business_name: requestedName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      if (updateError) throw new Error(updateError.message)
      businessName = requestedName
    } else {
      businessName = stored || requestedName || DEFAULT_APP_SETTINGS.businessName
    }
  } else {
    businessName = requestedName || DEFAULT_APP_SETTINGS.businessName
    const { error: settingsError } = await admin.from('app_settings').insert({
      user_id: userId,
      business_name: businessName,
      currency: DEFAULT_APP_SETTINGS.currency,
      theme: DEFAULT_APP_SETTINGS.theme,
      default_entry_mode: DEFAULT_APP_SETTINGS.defaultEntryMode,
      account_message_template: DEFAULT_APP_SETTINGS.accountMessageTemplate,
      transaction_message_template: DEFAULT_APP_SETTINGS.transactionMessageTemplate,
      message_note_plus: DEFAULT_APP_SETTINGS.messageNotePlus,
      message_note_minus: DEFAULT_APP_SETTINGS.messageNoteMinus,
      message_note_zero: DEFAULT_APP_SETTINGS.messageNoteZero,
      account_message_include_ledger_url: DEFAULT_APP_SETTINGS.accountMessageIncludeLedgerUrl,
      transaction_message_include_pdf_url: DEFAULT_APP_SETTINGS.transactionMessageIncludePdfUrl,
      transaction_message_include_ledger_url:
        DEFAULT_APP_SETTINGS.transactionMessageIncludeLedgerUrl,
      ledger_share_require_pin: DEFAULT_APP_SETTINGS.ledgerShareRequirePin,
      ledger_share_ttl_hours: DEFAULT_APP_SETTINGS.ledgerShareTtlHours,
      dashboard_expense_period: DEFAULT_APP_SETTINGS.dashboardExpensePeriod,
      floating_actions_show_labels: DEFAULT_APP_SETTINGS.floatingActionsShowLabels,
    })
    if (settingsError && settingsError.code !== '23505') {
      throw new Error(settingsError.message)
    }
    created = true
  }

  const { accountTypes, cashTypes } = await ensureDefaultTypes(userId)
  await ensureDummyBank(userId, businessName)
  await ensureStarterAccounts(userId, accountTypes, cashTypes)

  return { created, businessName }
}
