import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  DEFAULT_APP_SETTINGS,
  mapAppSettingsRow,
  normalizeDefaultEntryMode,
  normalizeOptionalUrl,
  normalizeUuidIdList,
} from '@/lib/appSettings'
import {
  DEFAULT_MESSAGE_NOTE_MINUS,
  DEFAULT_MESSAGE_NOTE_PLUS,
  DEFAULT_MESSAGE_NOTE_ZERO,
  normalizeMessageNote,
  normalizeMessageTemplate,
} from '@/lib/messageTemplates'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

type RpcSettings = {
  id?: number
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  logo_url?: string | null
  favicon_url?: string | null
  account_message_template?: string | null
  transaction_message_template?: string | null
  message_note_plus?: string | null
  message_note_minus?: string | null
  message_note_zero?: string | null
  cash_savings_cash_type_ids?: unknown
  cash_savings_account_type_ids?: unknown
  payable_receivable_cash_type_ids?: unknown
  payable_receivable_account_type_ids?: unknown
  payable_cash_type_ids?: unknown
  payable_account_type_ids?: unknown
  receivable_cash_type_ids?: unknown
  receivable_account_type_ids?: unknown
  updated_at?: string
}

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist|schema cache/i.test(msg)
  )
}

const COLUMN_SETS = [
  'business_name, currency, theme, default_entry_mode, logo_url, favicon_url, account_message_template, transaction_message_template, message_note_plus, message_note_minus, message_note_zero, cash_savings_cash_type_ids, cash_savings_account_type_ids, payable_receivable_cash_type_ids, payable_receivable_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, logo_url, favicon_url, account_message_template, transaction_message_template, cash_savings_cash_type_ids, cash_savings_account_type_ids, payable_receivable_cash_type_ids, payable_receivable_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, logo_url, favicon_url, cash_savings_cash_type_ids, cash_savings_account_type_ids, payable_receivable_cash_type_ids, payable_receivable_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, cash_savings_account_type_ids, payable_receivable_cash_type_ids, payable_receivable_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, cash_savings_account_type_ids, payable_cash_type_ids, payable_account_type_ids, receivable_cash_type_ids, receivable_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, cash_savings_account_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, cash_savings_cash_type_ids, updated_at',
  'business_name, currency, theme, default_entry_mode, updated_at',
  'business_name, currency, theme, updated_at',
]

async function readSettingsRow() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.rpc('rpc_get_app_settings')
  if (!error) return mapAppSettingsRow(data as RpcSettings)

  if (!isMissingRpc(error)) throw new Error(error.message)

  for (const select of COLUMN_SETS) {
    const { data: row, error: selectError } = await admin
      .from('app_settings')
      .select(select)
      .eq('id', 1)
      .maybeSingle()
    if (!selectError) {
      if (row) return mapAppSettingsRow(row as unknown as RpcSettings)
      return { ...DEFAULT_APP_SETTINGS }
    }
    if (!/column .* does not exist|Could not find/i.test(selectError.message)) {
      throw new Error(selectError.message)
    }
  }
  return { ...DEFAULT_APP_SETTINGS }
}

async function ensureSettingsRow() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('app_settings')
    .select('id')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (data) return

  const { error: insertError } = await admin.from('app_settings').insert({
    id: 1,
    business_name: DEFAULT_APP_SETTINGS.businessName,
    currency: DEFAULT_APP_SETTINGS.currency,
    theme: DEFAULT_APP_SETTINGS.theme,
    default_entry_mode: DEFAULT_APP_SETTINGS.defaultEntryMode,
  })
  if (insertError && insertError.code !== '23505') throw new Error(insertError.message)
}

const ID_LIST_PATCH_KEYS: Array<{ body: string; column: string }> = [
  { body: 'cashSavingsCashTypeIds', column: 'cash_savings_cash_type_ids' },
  { body: 'cashSavingsAccountTypeIds', column: 'cash_savings_account_type_ids' },
  { body: 'payableReceivableCashTypeIds', column: 'payable_receivable_cash_type_ids' },
  {
    body: 'payableReceivableAccountTypeIds',
    column: 'payable_receivable_account_type_ids',
  },
]

export async function GET() {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const settings = await readSettingsRow()
    return json({ settings })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  try {
    const body = await request.json().catch(() => ({}))
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.businessName !== undefined) {
      const businessName = String(body.businessName).trim()
      if (!businessName) return json({ error: 'Business name is required.' }, 400)
      patch.business_name = businessName
    }
    if (body.currency !== undefined) {
      const currency = String(body.currency).trim().toUpperCase()
      if (!currency) return json({ error: 'Currency is required.' }, 400)
      patch.currency = currency
    }
    if (body.theme !== undefined) {
      const theme = body.theme === 'light' ? 'light' : body.theme === 'dark' ? 'dark' : null
      if (!theme) return json({ error: 'Theme must be light or dark.' }, 400)
      patch.theme = theme
    }
    if (body.defaultEntryMode !== undefined) {
      patch.default_entry_mode = normalizeDefaultEntryMode(body.defaultEntryMode)
    }
    if (body.logoUrl !== undefined) {
      patch.logo_url = normalizeOptionalUrl(body.logoUrl)
    }
    if (body.faviconUrl !== undefined) {
      patch.favicon_url = normalizeOptionalUrl(body.faviconUrl)
    }
    if (body.accountMessageTemplate !== undefined) {
      patch.account_message_template = normalizeMessageTemplate(body.accountMessageTemplate)
    }
    if (body.transactionMessageTemplate !== undefined) {
      patch.transaction_message_template = normalizeMessageTemplate(
        body.transactionMessageTemplate
      )
    }
    if (body.messageNotePlus !== undefined) {
      patch.message_note_plus = normalizeMessageNote(
        body.messageNotePlus,
        DEFAULT_MESSAGE_NOTE_PLUS
      )
    }
    if (body.messageNoteMinus !== undefined) {
      patch.message_note_minus = normalizeMessageNote(
        body.messageNoteMinus,
        DEFAULT_MESSAGE_NOTE_MINUS
      )
    }
    if (body.messageNoteZero !== undefined) {
      patch.message_note_zero = normalizeMessageNote(
        body.messageNoteZero,
        DEFAULT_MESSAGE_NOTE_ZERO
      )
    }
    for (const key of ID_LIST_PATCH_KEYS) {
      if (body[key.body] !== undefined) {
        patch[key.column] = normalizeUuidIdList(body[key.body])
      }
    }

    await ensureSettingsRow()
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('app_settings').update(patch).eq('id', 1)
    if (error) {
      if (
        /logo_url|favicon_url/i.test(error.message) &&
        /does not exist|Could not find/i.test(error.message)
      ) {
        return json(
          {
            error:
              'Branding columns missing. Run database/settings-branding.sql in your database.',
          },
          500
        )
      }
      if (
        /account_message_template|transaction_message_template|message_note_/i.test(
          error.message
        ) &&
        /does not exist|Could not find/i.test(error.message)
      ) {
        return json(
          {
            error:
              'Message template columns missing. Run database/settings-message-templates.sql in your database.',
          },
          500
        )
      }
      if (
        /cash_savings_|payable_receivable_/i.test(error.message) &&
        /does not exist|Could not find/i.test(error.message)
      ) {
        return json(
          {
            error:
              'Dashboard filter columns missing. Run database/settings-cash-savings-types.sql in your database.',
          },
          500
        )
      }
      return json({ error: error.message }, 500)
    }

    const settings = await readSettingsRow()
    return json({ settings })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}
