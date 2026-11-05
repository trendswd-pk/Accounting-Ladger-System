import {
  DEFAULT_LEDGER_SHARE_TTL_HOURS,
  generateLedgerPin,
  generateLedgerShareToken,
  hashLedgerPin,
  LEDGER_SHARE_LOCK_MINUTES,
  MAX_LEDGER_SHARE_PIN_ATTEMPTS,
  verifyLedgerPin,
} from '@/lib/ledgerShareCrypto'
import { publicAppOrigin } from '@/lib/shortLinks'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeEntryType } from '@/lib/transactions'
import { transactionAttachmentFolder } from '@/lib/uploads'

export type LedgerShareMeta = {
  token: string
  accountName: string
  businessName: string
  expiresAt: string
  expired: boolean
  locked: boolean
}

export type LedgerShareAttachment = {
  id: string
  fileName: string
  publicUrl: string
  mimeType: string
}

export type LedgerShareTxn = {
  id: string
  entryNumber: number
  transactionDate: string
  narration: string
  entryType: 'credit' | 'debit'
  amount: number
  runningBalance: number
  attachments: LedgerShareAttachment[]
}

export type LedgerSharePayload = {
  account: {
    id: string
    name: string
    phone: string
    balance: number
    accountTypeName: string
    cashTypeName: string
  }
  businessName: string
  currency: string
  logoUrl: string | null
  expiresAt: string
  transactions: LedgerShareTxn[]
}

export async function createLedgerShareForAccount(
  accountId: string,
  req: Request,
  opts?: { ttlHours?: number }
): Promise<{
  token: string
  pin: string
  url: string
  expiresAt: string
}> {
  const admin = getSupabaseAdmin()
  const id = String(accountId ?? '').trim()
  if (!id) throw new Error('Account id is required.')

  const { data: account, error: accErr } = await admin
    .from('accounts')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()
  if (accErr) throw new Error(accErr.message)
  if (!account) throw new Error('Account not found.')

  const ttl = Math.max(
    1,
    Math.min(168, opts?.ttlHours ?? DEFAULT_LEDGER_SHARE_TTL_HOURS)
  )
  const token = generateLedgerShareToken()
  const pin = generateLedgerPin()
  const pinHash = hashLedgerPin(pin, token)
  const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('ledger_shares').insert({
    token,
    account_id: id,
    pin_hash: pinHash,
    expires_at: expiresAt,
    failed_attempts: 0,
    locked_until: null,
  })
  if (error) throw new Error(error.message)

  const origin = publicAppOrigin(req)
  return {
    token,
    pin,
    url: `${origin}/share/ledger/${encodeURIComponent(token)}`,
    expiresAt,
  }
}

export async function getLedgerShareMeta(
  token: string
): Promise<LedgerShareMeta | null> {
  const admin = getSupabaseAdmin()
  const t = String(token ?? '').trim()
  if (!t) return null

  const { data, error } = await admin
    .from('ledger_shares')
    .select('token, account_id, expires_at, locked_until, accounts ( name )')
    .eq('token', t)
    .maybeSingle()
  if (error || !data) return null

  const accounts = data.accounts as
    | { name: string }
    | { name: string }[]
    | null
  const accountName = Array.isArray(accounts)
    ? accounts[0]?.name ?? 'Account'
    : accounts?.name ?? 'Account'

  const { data: settings } = await admin
    .from('app_settings')
    .select('business_name')
    .eq('id', 1)
    .maybeSingle()

  const expiresAt = String(data.expires_at)
  const expired = new Date(expiresAt).getTime() <= Date.now()
  const lockedUntil = data.locked_until
    ? new Date(String(data.locked_until)).getTime()
    : 0
  const locked = lockedUntil > Date.now()

  return {
    token: t,
    accountName,
    businessName: String(settings?.business_name ?? 'Accounting Ledger'),
    expiresAt,
    expired,
    locked,
  }
}

export async function unlockLedgerShare(
  token: string,
  pin: string
): Promise<{ ok: true; payload: LedgerSharePayload } | { ok: false; error: string; status: number }> {
  const admin = getSupabaseAdmin()
  const t = String(token ?? '').trim()
  const p = String(pin ?? '').trim()
  if (!t) return { ok: false, error: 'Invalid link.', status: 404 }
  if (!/^\d{4}$/.test(p)) {
    return { ok: false, error: 'Enter the 4-digit access code.', status: 400 }
  }

  const { data: share, error } = await admin
    .from('ledger_shares')
    .select(
      'id, token, account_id, pin_hash, expires_at, failed_attempts, locked_until'
    )
    .eq('token', t)
    .maybeSingle()

  if (error || !share) {
    return { ok: false, error: 'Link not found.', status: 404 }
  }

  if (new Date(String(share.expires_at)).getTime() <= Date.now()) {
    return {
      ok: false,
      error: 'This link has expired. Ask for a new ledger message.',
      status: 410,
    }
  }

  const lockedUntil = share.locked_until
    ? new Date(String(share.locked_until)).getTime()
    : 0
  if (lockedUntil > Date.now()) {
    return {
      ok: false,
      error: 'Too many attempts. Try again later.',
      status: 429,
    }
  }

  if (!verifyLedgerPin(p, t, String(share.pin_hash))) {
    const attempts = (Number(share.failed_attempts) || 0) + 1
    const patch: Record<string, unknown> = { failed_attempts: attempts }
    if (attempts >= MAX_LEDGER_SHARE_PIN_ATTEMPTS) {
      patch.locked_until = new Date(
        Date.now() + LEDGER_SHARE_LOCK_MINUTES * 60 * 1000
      ).toISOString()
      patch.failed_attempts = 0
    }
    await admin.from('ledger_shares').update(patch).eq('id', share.id)
    const left = Math.max(0, MAX_LEDGER_SHARE_PIN_ATTEMPTS - attempts)
    return {
      ok: false,
      error:
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many attempts. Try again later.',
      status: 401,
    }
  }

  // Reset attempts on success
  await admin
    .from('ledger_shares')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('id', share.id)

  const payload = await buildLedgerPayload(
    String(share.account_id),
    String(share.expires_at)
  )
  return { ok: true, payload }
}

async function buildLedgerPayload(
  accountId: string,
  expiresAt: string
): Promise<LedgerSharePayload> {
  const admin = getSupabaseAdmin()

  const { data: account, error: accErr } = await admin
    .from('accounts')
    .select(
      'id, name, phone, account_types ( name ), cash_types ( name )'
    )
    .eq('id', accountId)
    .maybeSingle()
  if (accErr) throw new Error(accErr.message)
  if (!account) throw new Error('Account not found.')

  const accountTypes = account.account_types as
    | { name: string }
    | { name: string }[]
    | null
  const cashTypes = account.cash_types as
    | { name: string }
    | { name: string }[]
    | null
  const accountTypeName = Array.isArray(accountTypes)
    ? accountTypes[0]?.name ?? ''
    : accountTypes?.name ?? ''
  const cashTypeName = Array.isArray(cashTypes)
    ? cashTypes[0]?.name ?? ''
    : cashTypes?.name ?? ''

  const { data: settings } = await admin
    .from('app_settings')
    .select('business_name, currency, logo_url')
    .eq('id', 1)
    .maybeSingle()

  const { data: txRows, error: txErr } = await admin
    .from('transactions')
    .select('id, entry_number, transaction_date, narration, entry_type, balance')
    .eq('account_id', accountId)
    .order('transaction_date', { ascending: true })
    .order('entry_number', { ascending: true })
  if (txErr) throw new Error(txErr.message)

  type Slim = {
    id: string
    entry_number: number
    transaction_date: string
    narration: string | null
    entry_type: string | null
    balance: number | string
  }

  const rows = (txRows ?? []) as Slim[]
  let running = 0
  const withRunning = rows.map((r) => {
    const entryType = normalizeEntryType(r.entry_type)
    const amount = Math.abs(Number(r.balance) || 0)
    const signed = entryType === 'debit' ? -amount : amount
    running += signed
    return {
      id: r.id,
      entryNumber: Number(r.entry_number) || 0,
      transactionDate: String(r.transaction_date).slice(0, 10),
      narration: String(r.narration ?? '').trim(),
      entryType,
      amount,
      runningBalance: running,
    }
  })

  // Attachments for all txns in one query (folder prefix match).
  const folders = withRunning.map((t) => transactionAttachmentFolder(t.id))
  const attachmentsByTxn = new Map<string, LedgerShareAttachment[]>()
  if (folders.length > 0) {
    const { data: files } = await admin
      .from('file_attachments')
      .select('id, file_name, public_url, mime_type, folder')
      .in('folder', folders)
      .order('created_at', { ascending: false })

    for (const f of files ?? []) {
      const folder = String(f.folder ?? '')
      const txnId = folder.replace(/^transactions\//, '')
      if (!txnId) continue
      const list = attachmentsByTxn.get(txnId) ?? []
      list.push({
        id: String(f.id),
        fileName: String(f.file_name ?? 'file'),
        publicUrl: String(f.public_url ?? ''),
        mimeType: String(f.mime_type ?? ''),
      })
      attachmentsByTxn.set(txnId, list)
    }
  }

  // Chronological (oldest → newest) like the ledger PDF statement.
  const transactions: LedgerShareTxn[] = withRunning.map((t) => ({
    ...t,
    attachments: (attachmentsByTxn.get(t.id) ?? []).filter((a) => a.publicUrl),
  }))

  const logoRaw = String(settings?.logo_url ?? '').trim()

  return {
    account: {
      id: account.id,
      name: account.name,
      phone: String(account.phone ?? ''),
      balance: running,
      accountTypeName,
      cashTypeName,
    },
    businessName: String(settings?.business_name ?? 'Accounting Ledger'),
    currency: String(settings?.currency ?? 'PKR'),
    logoUrl: logoRaw || null,
    expiresAt,
    transactions,
  }
}
