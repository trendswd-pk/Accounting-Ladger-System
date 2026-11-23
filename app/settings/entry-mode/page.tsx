import { redirect } from 'next/navigation'

export default function EntryModeSettingsRedirect() {
  redirect('/settings/transactions')
}
