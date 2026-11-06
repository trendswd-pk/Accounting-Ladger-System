import { formatDisplayDateTime } from '@/lib/localDate'
import { requireDemoUser } from '@/lib/demoAuth'
import {
  findLedgerShareByToken,
  findLedgerShareOwnerUserId,
  getAccountTypes,
  getBankDetails,
  getCashTypes,
  getStoredAccounts,
  getStoredSettings,
  getStoredTransactions,
  getStoredUploads,
  newId,
  setLedgerShares,
  getLedgerShares,
  updateLedgerShareByToken,
  type DemoLedgerShare,
} from '@/lib/demoStore'
import {
  DEFAULT_LEDGER_SHARE_TTL_HOURS,
  generateLedgerPin,
  generateLedgerShareToken,
  hashLedgerPin,
  LEDGER_SHARE_LOCK_MINUTES,
  MAX_LEDGER_SHARE_PIN_ATTEMPTS,
  normalizeLedgerShareTtlHours,
  verifyLedgerPin,
} from '@/lib/ledgerShareCrypto'
import { signedTransactionAmount } from '@/lib/transactions'
import { transactionAttachmentFolder } from '@/lib/uploads'

export type CreatedLedgerShare = {
  token: string
  pin: string
  url: string
  expiresAt: string
  requirePin: boolean
}

export function formatShareExpiryLabel(iso: string): string {
  return formatDisplayDateTime(iso)
}

export function buildShareAccessFooter(opts: {
  url: string
  pin: string
  expiresAt: string
}): string {
  const lines = [`Ledger preview: ${opts.url}`]
  const pin = String(opts.pin ?? '').trim()
  if (pin) lines.push(`Access code: ${pin}`)
  lines.push(`Valid until: ${formatShareExpiryLabel(opts.expiresAt)}`)
  return lines.join('\n')
}

export async function createLedgerShare(
  accountId: string
): Promise<CreatedLedgerShare> {
  requireDemoUser()
  const account = getStoredAccounts().find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found.')

  const settings = getStoredSettings()
  const requirePin = settings?.ledgerShareRequirePin !== false
  const ttl = normalizeLedgerShareTtlHours(
    settings?.ledgerShareTtlHours ?? DEFAULT_LEDGER_SHARE_TTL_HOURS
  )

  const token = generateLedgerShareToken()
  const pin = requirePin ? generateLedgerPin() : ''
  const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString()

  const row: DemoLedgerShare = {
    id: newId('ls'),
    token,
    accountId,
    pinHash: requirePin ? hashLedgerPin(pin, token) : '',
    requirePin,
    expiresAt,
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
  }
  setLedgerShares([...getLedgerShares(), row])

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return {
    token,
    pin,
    url: `${origin}/share/ledger/${encodeURIComponent(token)}`,
    expiresAt,
    requirePin,
  }
}

export async function fetchLedgerShareMeta(token: string) {
  const share = findLedgerShareByToken(token)
  if (!share) throw new Error('Link not found.')
  const ownerId = findLedgerShareOwnerUserId(token) ?? undefined
  const account = getStoredAccounts(ownerId).find((a) => a.id === share.accountId)
  const settings = getStoredSettings(ownerId)
  const expired = new Date(share.expiresAt).getTime() <= Date.now()
  const locked =
    !!share.lockedUntil && new Date(share.lockedUntil).getTime() > Date.now()
  const requirePin = share.requirePin !== false && Boolean(share.pinHash)
  return {
    token,
    accountName: account?.name ?? 'Account',
    businessName: settings?.businessName ?? 'Accounting Ledger',
    expiresAt: share.expiresAt,
    expired,
    locked,
    requirePin,
  }
}

export async function unlockLedgerShareDemo(token: string, pin: string) {
  const share = findLedgerShareByToken(token)
  if (!share) {
    const err = new Error('Link not found.')
    ;(err as Error & { status?: number }).status = 404
    throw err
  }
  if (new Date(share.expiresAt).getTime() <= Date.now()) {
    const err = new Error(
      'This link has expired. Ask for a new ledger message.'
    )
    ;(err as Error & { status?: number }).status = 410
    throw err
  }

  const requirePin = share.requirePin !== false && Boolean(share.pinHash)

  if (requirePin) {
    if (
      share.lockedUntil &&
      new Date(share.lockedUntil).getTime() > Date.now()
    ) {
      const err = new Error('Too many attempts. Try again later.')
      ;(err as Error & { status?: number }).status = 429
      throw err
    }
    if (!verifyLedgerPin(pin, token, share.pinHash)) {
      const attempts = share.failedAttempts + 1
      const patch: Partial<DemoLedgerShare> = { failedAttempts: attempts }
      if (attempts >= MAX_LEDGER_SHARE_PIN_ATTEMPTS) {
        patch.lockedUntil = new Date(
          Date.now() + LEDGER_SHARE_LOCK_MINUTES * 60 * 1000
        ).toISOString()
        patch.failedAttempts = 0
      }
      updateLedgerShareByToken(token, patch)
      const left = Math.max(0, MAX_LEDGER_SHARE_PIN_ATTEMPTS - attempts)
      const err = new Error(
        left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many attempts. Try again later.'
      )
      ;(err as Error & { status?: number }).status = 401
      throw err
    }
  }

  updateLedgerShareByToken(token, { failedAttempts: 0, lockedUntil: null })

  const ownerId = findLedgerShareOwnerUserId(token) ?? undefined
  const account = getStoredAccounts(ownerId).find((a) => a.id === share.accountId)
  if (!account) throw new Error('Account not found.')
  const settings = getStoredSettings(ownerId)
  const currency = settings?.currency ?? 'PKR'
  const businessName = settings?.businessName ?? 'Accounting Ledger'

  const txns = getStoredTransactions(ownerId)
    .filter((t) => t.accountId === share.accountId)
    .slice()
    .sort((a, b) => {
      const byDate = a.transactionDate.localeCompare(b.transactionDate)
      if (byDate !== 0) return byDate
      return a.entryNumber - b.entryNumber
    })

  let running = 0
  const withRunning = txns.map((t) => {
    running += signedTransactionAmount(t)
    return {
      id: t.id,
      entryNumber: t.entryNumber,
      transactionDate: t.transactionDate.slice(0, 10),
      narration: t.narration,
      entryType: t.entryType,
      amount: Math.abs(Number(t.balance) || 0),
      runningBalance: running,
      attachments: getStoredUploads(ownerId)
        .filter((f) => f.folder === transactionAttachmentFolder(t.id))
        .map((f) => ({
          id: f.id,
          fileName: f.fileName,
          publicUrl: f.publicUrl,
          mimeType: f.mimeType,
        })),
    }
  })

  const accountTypes = getAccountTypes(ownerId)
  const cashTypes = getCashTypes(ownerId)
  const accountTypeName =
    accountTypes.find((t) => t.id === account.accountTypeId)?.name ?? ''
  const cashTypeName =
    cashTypes.find((t) => t.id === account.cashTypeId)?.name ?? ''

  const banks = getBankDetails(ownerId)
    .filter((b) => b.active)
    .map((b) => ({
      id: b.id,
      bankName: b.bankName,
      accountTitle: b.accountTitle,
      accountNumber: b.accountNumber,
      iban: b.iban,
      branchName: b.branchName,
      branchCode: b.branchCode,
      swiftCode: b.swiftCode,
      notes: b.notes,
      qrCodeUrl: b.qrCodeUrl,
    }))

  return {
    account: {
      id: account.id,
      name: account.name,
      phone: account.phone,
      balance: running,
      accountTypeName,
      cashTypeName,
    },
    businessName,
    currency,
    logoUrl: settings?.logoUrl ?? null,
    expiresAt: share.expiresAt,
    transactions: withRunning,
    banks,
  }
}
