import { redirect } from 'next/navigation'

export default function TransactionImportExportRedirect() {
  redirect('/settings/transactions')
}
