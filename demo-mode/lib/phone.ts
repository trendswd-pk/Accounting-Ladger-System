/** Dial-code options for account phone (default Pakistan). */
export type PhoneCountry = {
  iso: string
  name: string
  /** Digits only, e.g. "92" */
  dial: string
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'AE', name: 'UAE', dial: '971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'BD', name: 'Bangladesh', dial: '880' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]! // Pakistan +92

/** Digits only (no +). */
export function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * National number for storage/UI: strip spaces and a single leading 0
 * (common PK mobile form 03xx…).
 */
export function normalizeNationalNumber(national: string): string {
  let d = digitsOnly(national)
  if (d.startsWith('0')) d = d.slice(1)
  return d
}

/** Compose E.164-style storage value, e.g. "+923059778976". Empty if no national digits. */
export function composePhoneE164(dial: string, national: string): string {
  const d = digitsOnly(dial)
  const n = normalizeNationalNumber(national)
  if (!n) return ''
  // Avoid double country code if user pasted full international in the national field
  if (d && n.startsWith(d) && n.length > d.length + 5) {
    return `+${n}`
  }
  return d ? `+${d}${n}` : `+${n}`
}

/**
 * Split a stored phone into dial + national for the form.
 * Heuristics: known dial prefixes; bare 10-digit PK mobiles (3xxxxxxxxx).
 */
export function splitPhone(
  stored: string,
  fallback: PhoneCountry = DEFAULT_PHONE_COUNTRY
): { dial: string; national: string; iso: string } {
  const raw = String(stored ?? '').trim()
  if (!raw) {
    return { dial: fallback.dial, national: '', iso: fallback.iso }
  }

  let d = digitsOnly(raw)

  // Longest matching known dial code first
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (d.startsWith(c.dial) && d.length > c.dial.length) {
      return { dial: c.dial, national: d.slice(c.dial.length), iso: c.iso }
    }
  }

  // Local PK mobile without country code: 03xx… or 3xx… (10 digits after strip 0)
  const national = normalizeNationalNumber(d)
  if (/^3\d{9}$/.test(national)) {
    return { dial: '92', national, iso: 'PK' }
  }

  return { dial: fallback.dial, national: national || d, iso: fallback.iso }
}

/**
 * WhatsApp / wa.me expects country code + number, digits only (no +).
 * Bare local numbers default to Pakistan (+92).
 */
export function toWhatsAppDigits(phone: string | null | undefined): string {
  const raw = String(phone ?? '').trim()
  if (!raw) return ''

  let d = digitsOnly(raw)
  if (!d) return ''

  // Already has a known country dial prefix
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (d.startsWith(c.dial) && d.length >= c.dial.length + 7) {
      return d
    }
  }

  // Leading 0 → drop and apply default PK
  if (d.startsWith('0')) d = d.slice(1)

  // Typical PK mobile 10 digits starting with 3
  if (/^3\d{9}$/.test(d)) {
    return `92${d}`
  }

  // Fallback: still prefix PK if it looks like a short local line (8–11 digits)
  if (d.length >= 8 && d.length <= 11 && !d.startsWith('92')) {
    return `92${d}`
  }

  return d
}
