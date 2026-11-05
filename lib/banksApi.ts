import { NextResponse } from 'next/server'
import { mapBankDetailRow, type BankDetailInput } from '@/lib/banks'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

const SELECT_COLS =
  'id, bank_name, account_title, account_number, iban, branch_name, branch_code, swift_code, notes, qr_code_url, active, created_at'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE })
}

function isMissingRpc(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = error.message || ''
  return (
    error.code === 'PGRST202' ||
    /could not find the function|function .* does not exist|schema cache/i.test(msg)
  )
}

function normalizeInput(body: BankDetailInput | Record<string, unknown>) {
  const bankName = String(body.bankName ?? '').trim()
  const accountTitle = String(body.accountTitle ?? '').trim()
  const accountNumber = String(body.accountNumber ?? '').trim()
  const iban = String(body.iban ?? '').trim()
  const branchName = String(body.branchName ?? '').trim()
  const branchCode = String(body.branchCode ?? '').trim()
  const swiftCode = String(body.swiftCode ?? '').trim().toUpperCase()
  const notes = String(body.notes ?? '').trim()
  const qrRaw = body.qrCodeUrl
  const qrCodeUrl =
    qrRaw === null || qrRaw === undefined
      ? null
      : String(qrRaw).trim() || null
  const active = body.active !== false

  return {
    bankName,
    accountTitle,
    accountNumber,
    iban,
    branchName,
    branchCode,
    swiftCode,
    notes,
    qrCodeUrl,
    active,
  }
}

async function listViaSelect() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('bank_details')
    .select(SELECT_COLS)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapBankDetailRow)
}

export async function listBanks() {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('rpc_list_bank_details')
    if (error) {
      if (isMissingRpc(error)) {
        const items = await listViaSelect()
        return json({ items, via: 'select-fallback' })
      }
      return json({ error: error.message }, 500)
    }
    const rows = (Array.isArray(data) ? data : []) as Parameters<
      typeof mapBankDetailRow
    >[0][]
    return json({ items: rows.map(mapBankDetailRow), via: 'rpc' })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Server error' },
      500
    )
  }
}

export async function createBankRow(body: BankDetailInput) {
  try {
    const input = normalizeInput(body)
    if (!input.bankName) return json({ error: 'Bank name is required.' }, 400)
    if (!input.accountTitle) {
      return json({ error: 'Account title is required.' }, 400)
    }
    if (!input.accountNumber) {
      return json({ error: 'Account number is required.' }, 400)
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('bank_details')
      .insert({
        bank_name: input.bankName,
        account_title: input.accountTitle,
        account_number: input.accountNumber,
        iban: input.iban,
        branch_name: input.branchName,
        branch_code: input.branchCode,
        swift_code: input.swiftCode,
        notes: input.notes,
        qr_code_url: input.qrCodeUrl,
        active: input.active,
      })
      .select(SELECT_COLS)
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ item: mapBankDetailRow(data) }, 201)
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Server error' },
      500
    )
  }
}

export async function updateBankRow(id: string, body: BankDetailInput) {
  try {
    const bankId = String(id ?? '').trim()
    if (!bankId) return json({ error: 'Missing id.' }, 400)

    const input = normalizeInput(body)
    if (!input.bankName) return json({ error: 'Bank name is required.' }, 400)
    if (!input.accountTitle) {
      return json({ error: 'Account title is required.' }, 400)
    }
    if (!input.accountNumber) {
      return json({ error: 'Account number is required.' }, 400)
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('bank_details')
      .update({
        bank_name: input.bankName,
        account_title: input.accountTitle,
        account_number: input.accountNumber,
        iban: input.iban,
        branch_name: input.branchName,
        branch_code: input.branchCode,
        swift_code: input.swiftCode,
        notes: input.notes,
        qr_code_url: input.qrCodeUrl,
        active: input.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bankId)
      .select(SELECT_COLS)
      .single()

    if (error) return json({ error: error.message }, 400)
    return json({ item: mapBankDetailRow(data) })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Server error' },
      500
    )
  }
}

export async function deleteBankRow(id: string) {
  try {
    const bankId = String(id ?? '').trim()
    if (!bankId) return json({ error: 'Missing id.' }, 400)

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('bank_details').delete().eq('id', bankId)
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Server error' },
      500
    )
  }
}
