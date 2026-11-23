import { Capacitor } from '@capacitor/core'

/** True only inside the Capacitor Android/iOS shell (not browser / PWA). */
export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
