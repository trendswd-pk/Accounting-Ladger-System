import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
  type CheckBiometryResult,
} from '@aparajita/capacitor-biometric-auth'
import { Preferences } from '@capacitor/preferences'
import { isCapacitorNative } from '@/lib/capacitorNative'

const PREF_ENABLED = 'trends_wd_biometric_unlock_enabled'

/** In-memory unlock for the current process (cleared when app backgrounds). */
let unlockedThisProcess = false

export function isBiometricUnlocked(): boolean {
  return unlockedThisProcess
}

export function markBiometricUnlocked(): void {
  unlockedThisProcess = true
}

export function markBiometricLocked(): void {
  unlockedThisProcess = false
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  if (!isCapacitorNative()) return false
  const { value } = await Preferences.get({ key: PREF_ENABLED })
  return value === '1'
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  if (!isCapacitorNative()) return
  if (enabled) {
    await Preferences.set({ key: PREF_ENABLED, value: '1' })
  } else {
    await Preferences.remove({ key: PREF_ENABLED })
  }
}

/** Call on explicit logout — disables biometric unlock for this device. */
export async function clearBiometricUnlock(): Promise<void> {
  markBiometricLocked()
  await setBiometricUnlockEnabled(false)
}

export async function checkDeviceBiometry(): Promise<CheckBiometryResult | null> {
  if (!isCapacitorNative()) return null
  try {
    return await BiometricAuth.checkBiometry()
  } catch {
    return null
  }
}

/**
 * After a successful password login: enable biometric unlock when hardware allows.
 * No-ops on web / when biometry is unavailable.
 */
export async function enableBiometricUnlockAfterLogin(): Promise<boolean> {
  if (!isCapacitorNative()) return false
  const info = await checkDeviceBiometry()
  if (!info?.isAvailable) return false
  await setBiometricUnlockEnabled(true)
  markBiometricUnlocked()
  return true
}

export type BiometricPromptResult =
  | { ok: true }
  | { ok: false; cancelled: boolean; message: string }

export async function promptBiometricUnlock(): Promise<BiometricPromptResult> {
  if (!isCapacitorNative()) {
    return { ok: false, cancelled: false, message: 'Not a native app.' }
  }
  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock Accounting Ledger',
      cancelTitle: 'Use password',
      allowDeviceCredential: true,
      androidTitle: 'Unlock Ledger',
      androidSubtitle: 'Confirm fingerprint or screen lock',
      androidBiometryStrength: AndroidBiometryStrength.weak,
      androidConfirmationRequired: false,
    })
    markBiometricUnlocked()
    return { ok: true }
  } catch (err) {
    const code = err instanceof BiometryError ? err.code : BiometryErrorType.none
    const cancelled =
      code === BiometryErrorType.userCancel ||
      code === BiometryErrorType.appCancel ||
      code === BiometryErrorType.systemCancel ||
      code === BiometryErrorType.userFallback
    const message =
      err instanceof BiometryError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Biometric unlock failed.'
    return { ok: false, cancelled, message }
  }
}
