'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { clearBiometricUnlock } from '@/lib/biometricUnlock'
import { clearClientSessionCaches } from '@/lib/clearClientSessionCaches'
import { exitEmbeddedDemoMode } from '@/lib/embeddedDemo'
import {
  getDemoUser,
  isEmbeddedDemoActive,
  updateDemoProfile,
} from '@/lib/embeddedDemo/session'
import {
  MIN_PASSWORD_LENGTH,
  validateNewPasswordPair,
} from '@/lib/authPassword'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

function displayNameFromUser(user: User | null): string {
  if (!user) return ''
  const meta = user.user_metadata ?? {}
  return String(meta.full_name || meta.name || '').trim()
}

function friendlyAuthError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : ''
  const lower = msg.toLowerCase()
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials') ||
    lower.includes('wrong password')
  ) {
    return 'Current password is incorrect.'
  }
  return msg || fallback
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [passwordInfoOpen, setPasswordInfoOpen] = useState(false)
  const [accountInfoOpen, setAccountInfoOpen] = useState(false)

  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (isEmbeddedDemoActive()) {
          const demo = getDemoUser()
          if (cancelled) return
          if (!demo) {
            router.replace('/login')
            return
          }
          setDemoMode(true)
          setUser(null)
          setFullName(demo.fullName)
          setEmail(demo.email)
          return
        }
        const supabase = createClient()
        const {
          data: { user: current },
          error,
        } = await supabase.auth.getUser()
        if (cancelled) return
        if (error || !current) {
          router.replace('/login')
          return
        }
        setDemoMode(false)
        setUser(current)
        setFullName(displayNameFromUser(current))
        setEmail(current.email ?? '')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    const name = fullName.trim()
    if (!name) {
      setProfileMessage({ type: 'error', text: 'Name is required.' })
      return
    }
    setSavingProfile(true)
    try {
      if (demoMode || isEmbeddedDemoActive()) {
        const next = updateDemoProfile({ fullName: name, email: email.trim() })
        setFullName(next.fullName)
        setEmail(next.email)
        setProfileMessage({
          type: 'success',
          text: 'Profile saved (Demo Mode — browser only).',
        })
        return
      }
      const supabase = createClient()
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name, name },
      })
      if (error) throw error
      if (data.user) {
        setUser(data.user)
        setFullName(displayNameFromUser(data.user))
        setEmail(data.user.email ?? email)
      }
      setProfileMessage({ type: 'success', text: 'Profile saved.' })
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save profile.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)
    if (demoMode || isEmbeddedDemoActive()) {
      setPasswordMessage({
        type: 'error',
        text: 'Password changes are disabled in Demo Mode.',
      })
      return
    }
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Current password is required.' })
      return
    }
    const validationError = validateNewPasswordPair(newPassword, confirmPassword)
    if (validationError) {
      setPasswordMessage({ type: 'error', text: validationError })
      return
    }
    if (newPassword === currentPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be different from your current password.',
      })
      return
    }
    const accountEmail = (user?.email ?? email).trim()
    if (!accountEmail) {
      setPasswordMessage({
        type: 'error',
        text: 'Could not verify your account email. Sign out and sign in again.',
      })
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      // Re-authenticate so a wrong current password fails clearly before update.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword,
      })
      if (reauthError) {
        throw new Error(friendlyAuthError(reauthError, 'Current password is incorrect.'))
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      await clearBiometricUnlock().catch(() => undefined)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage({
        type: 'success',
        text: 'Password updated. You stay signed in on this device.',
      })
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: friendlyAuthError(err, 'Could not update password.'),
      })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    setProfileMessage(null)
    setPasswordMessage(null)
    try {
      if (demoMode || isEmbeddedDemoActive()) {
        exitEmbeddedDemoMode({ wipeData: false })
        router.replace('/login')
        router.refresh()
        return
      }
      const supabase = createClient()
      await clearBiometricUnlock().catch(() => undefined)
      await supabase.auth.signOut()
      clearClientSessionCaches()
      router.replace('/login')
      router.refresh()
    } catch (err) {
      setProfileMessage({
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
                  Update your display name or change your password. Email is view-only. Sign out ends
                  this session.
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
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Account</h2>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setAccountInfoOpen((v) => !v)}
                  className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    accountInfoOpen
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
                  }`}
                  aria-label="About Account"
                  aria-expanded={accountInfoOpen}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
                {accountInfoOpen ? (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAccountInfoOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="dialog"
                      className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Your display name for this account. Login email is shown below and cannot be
                      changed here.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
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
              <label
                htmlFor="profile-email"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
                className={`${inputClass} cursor-default bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300`}
                placeholder="you@example.com"
                autoComplete="email"
                aria-readonly="true"
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
            {profileMessage ? (
              <p
                className={`mt-3 text-sm ${
                  profileMessage.type === 'success'
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
                role="status"
              >
                {profileMessage.text}
              </p>
            ) : null}
          </div>
        </form>

        <form
          onSubmit={(e) => void handleChangePassword(e)}
          className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
        >
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Change password
              </h2>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setPasswordInfoOpen((v) => !v)}
                  className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    passwordInfoOpen
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
                  }`}
                  aria-label="About Change password"
                  aria-expanded={passwordInfoOpen}
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
                {passwordInfoOpen ? (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setPasswordInfoOpen(false)}
                      aria-hidden
                    />
                    <div
                      role="dialog"
                      className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Enter your current password, then a new one (min. {MIN_PASSWORD_LENGTH}{' '}
                      characters). Your session stays active after a successful update.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div>
              <label
                htmlFor="profile-current-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Current password
              </label>
              <input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={demoMode}
              />
            </div>
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
                minLength={MIN_PASSWORD_LENGTH}
                disabled={demoMode}
              />
            </div>
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm new password
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={MIN_PASSWORD_LENGTH}
                disabled={demoMode}
              />
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <button
              type="submit"
              disabled={savingPassword || loading || demoMode}
              className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
            {passwordMessage ? (
              <p
                className={`mt-3 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'text-primary-700 dark:text-primary-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
                role="status"
              >
                {passwordMessage.text}
              </p>
            ) : null}
            {demoMode ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Password changes are disabled in Demo Mode. Use a real account to change passwords.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
