'use client'

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  composePhoneE164,
  splitPhone,
} from '@/lib/phone'

type PhoneInputProps = {
  id?: string
  /** Stored E.164 / free-text value from the account row */
  value: string
  onChange: (e164: string) => void
  disabled?: boolean
  className?: string
  inputClassName?: string
  placeholder?: string
}

/**
 * Country dial code + national number. Emits E.164 (`+9230…`) for storage / WhatsApp.
 */
export default function PhoneInput({
  id = 'phone',
  value,
  onChange,
  disabled = false,
  className = '',
  inputClassName = '',
  placeholder = 'e.g. 3059778976',
}: PhoneInputProps) {
  const parts = splitPhone(value)
  const dial = parts.dial || DEFAULT_PHONE_COUNTRY.dial
  const national = parts.national

  const selectClass = [
    'shrink-0 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2.5 py-2 text-sm text-gray-900',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
    disabled ? 'opacity-60 cursor-not-allowed' : '',
  ].join(' ')

  const fieldClass = [
    inputClassName ||
      'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    '!rounded-l-none rounded-r-md',
  ].join(' ')

  return (
    <div className={`flex items-stretch ${className}`}>
      <label htmlFor={`${id}-country`} className="sr-only">
        Country code
      </label>
      <select
        id={`${id}-country`}
        value={dial}
        disabled={disabled}
        aria-label="Country code"
        className={selectClass}
        onChange={(e) => {
          const nextDial = e.target.value
          onChange(composePhoneE164(nextDial, national))
        }}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={`${c.iso}-${c.dial}`} value={c.dial}>
            {c.iso} +{c.dial}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        placeholder={placeholder}
        aria-label="Phone number"
        className={fieldClass}
        onChange={(e) => {
          onChange(composePhoneE164(dial, e.target.value))
        }}
      />
    </div>
  )
}
