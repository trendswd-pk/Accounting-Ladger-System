'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Keep React state in sync when Android / iOS password managers fill the DOM
 * without a reliable React `onChange` (common in Capacitor WebViews).
 * Without this, the next render resets `value=""` and the manager re-prompts.
 */
export function useAutofillDomSync(
  ref: RefObject<HTMLInputElement | null>,
  setValue: (next: string) => void
): void {
  const setValueRef = useRef(setValue)
  setValueRef.current = setValue

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let lastPushed = el.value

    const sync = () => {
      const domValue = el.value
      if (domValue === lastPushed) return
      lastPushed = domValue
      setValueRef.current(domValue)
    }

    el.addEventListener('input', sync)
    el.addEventListener('change', sync)

    const onAnimationStart = (event: AnimationEvent) => {
      // globals.css: input:-webkit-autofill { animation-name: als-on-autofill }
      if (event.animationName === 'als-on-autofill') sync()
    }
    el.addEventListener('animationstart', onAnimationStart as EventListener)

    const onFocus = () => {
      sync()
      window.setTimeout(sync, 50)
      window.setTimeout(sync, 200)
      window.setTimeout(sync, 500)
    }
    el.addEventListener('focus', onFocus)

    // Credential Manager often fills after the sheet closes, with delayed events.
    const timers = [0, 50, 100, 250, 500, 1000, 2000].map((ms) =>
      window.setTimeout(sync, ms)
    )

    return () => {
      el.removeEventListener('input', sync)
      el.removeEventListener('change', sync)
      el.removeEventListener('animationstart', onAnimationStart as EventListener)
      el.removeEventListener('focus', onFocus)
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [ref])
}

/** Prefer live DOM / FormData values over possibly stale React state after autofill. */
export function readLoginCredentials(
  form: HTMLFormElement,
  fallback: { email: string; password: string }
): { email: string; password: string } {
  const fd = new FormData(form)
  const fromNamed =
    String(fd.get('username') ?? fd.get('email') ?? '').trim() ||
    fallback.email.trim()
  const password =
    String(fd.get('password') ?? '') || fallback.password

  const emailInput = form.querySelector<HTMLInputElement>(
    'input#login-email, input[name="username"], input[name="email"]'
  )
  const passwordInput = form.querySelector<HTMLInputElement>(
    'input#login-password, input[name="password"]'
  )

  return {
    email: (emailInput?.value ?? fromNamed).trim() || fromNamed,
    password: passwordInput?.value || password,
  }
}
