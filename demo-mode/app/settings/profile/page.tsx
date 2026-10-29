'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, LogOut } from 'lucide-react'
import {
  getDemoUser,
  signOutDemo,
  updateDemoPassword,
  updateDemoProfile,
  type DemoAuthUser,
} from '@/lib/demoAuth'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<DemoAuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    const current = getDemoUser()
    if (!current) {
      router.replace('/login')
      return
    }
    setUser(current)
    setFullName(current.fullName)
    setEmail(current.email)
    setLoading(false)
  }, [router])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const name = fullName.trim()
    const nextEmail = email.trim()
    if (!name) {
      setMessage({ type: 'error', text: 'Name is required.' })
      return
    }
    if (!nextEmail) {
      setMessage({ type: 'error', text: 'Email is required.' })
      return
    }
    setSavingProfile(true)
    try {
      const updated = updateDemoProfile({ fullName: name, email: nextEmail })
      setUser(updated)
      setFullName(updated.fullName)
      setEmail(updated.email)
      setMessage({ type: 'success', text: 'Profile saved for this demo session.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save profile.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setSavingPassword(true)
    try {
      updateDemoPassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setMessage({
        type: 'success',
        text: 'Password noted for this demo session. Fixed demo login passwords are unchanged.',
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update password.',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    setMessage(null)
    try {
      signOutDemo()
      router.replace('/login')
      router.refresh()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not sign out.',
      })
      setSigningOut(false)
    }
  }

  return (
    <div className={`w-full p-4 lg:p-8 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Profile
          </h1>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                infoOpen
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
              }`}
              aria-label="About Profile"
              aria-expanded={infoOpen}
            >
              <Info className="h-4 w-4" aria-hidden />
            </button>
            {infoOpen ? (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden />
                <div
                  role="dialog"
                  className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Update your display name for this demo session. Sign out ends the local session.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut || loading}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      <div className="space-y-6">
        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
        >
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Your display name and login email for this demo account
              {user ? ` (${user.role})` : ''}.
            </p>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              type="submit"
              disabled={savingProfile || loading}
              className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>

        <form
          onSubmit={(e) => void handleChangePassword(e)}
          className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
        >
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Password</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Demo logins keep fixed passwords on the login cards; this confirms the form flow.
            </p>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div>
              <label
                htmlFor="profile-new-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New password
              </label>
              <input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm password
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              type="submit"
              disabled={savingPassword || loading}
              className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            message.type === 'success'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
