/**
 * Demo Mode accounts API — localStorage-backed helpers (no NextResponse / Supabase).
 */
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
  type AccountInput,
  type AccountRecord,
} from '@/lib/accounts'

export async function listAccounts(): Promise<{ items: AccountRecord[]; via: string }> {
  const items = await fetchAccounts({ force: true })
  return { items, via: 'demo-store' }
}

export async function createAccountRow(body: {
  name?: string
  phone?: string
  accountTypeId?: string
  cashTypeId?: string
}): Promise<{ item: AccountRecord }> {
  const item = await createAccount({
    name: String(body.name ?? ''),
    phone: String(body.phone ?? ''),
    accountTypeId: String(body.accountTypeId ?? ''),
    cashTypeId: String(body.cashTypeId ?? ''),
  })
  return { item }
}

export async function updateAccountRow(
  id: string,
  body: { name?: string; phone?: string; accountTypeId?: string; cashTypeId?: string }
): Promise<{ item: AccountRecord }> {
  const input: AccountInput = {
    name: String(body.name ?? ''),
    phone: String(body.phone ?? ''),
    accountTypeId: String(body.accountTypeId ?? ''),
    cashTypeId: String(body.cashTypeId ?? ''),
  }
  const item = await updateAccount(id, input)
  return { item }
}

export async function deleteAccountRow(id: string): Promise<{ ok: true }> {
  await deleteAccount(id)
  return { ok: true }
}
