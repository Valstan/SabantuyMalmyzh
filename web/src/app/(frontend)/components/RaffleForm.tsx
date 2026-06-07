'use client'

import Link from 'next/link'
import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'

// I4 «Розыгрыш призов»: ФИО + телефон + согласие 152-ФЗ → POST /api/raffle-entries (локализовано, I11).
type Status = 'idle' | 'submitting' | 'success' | 'error'

export function RaffleForm({ raffleId, locale = 'ru' }: { raffleId: number; locale?: Locale }) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)

    if (data.get('consent') !== 'on') {
      setStatus('error')
      setError(t(locale, 'form.consent'))
      return
    }

    const payload = {
      raffle: raffleId,
      fullName: String(data.get('fullName') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      consent: true,
    }

    try {
      const res = await fetch('/api/raffle-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.errors?.[0]?.message || t(locale, 'form.netError')
        setStatus('error')
        setError(msg)
        return
      }

      form.reset()
      setStatus('success')
    } catch {
      setStatus('error')
      setError(t(locale, 'form.netError'))
    }
  }

  const req = <abbr title={t(locale, 'form.required')}>*</abbr>

  if (status === 'success') {
    return (
      <div className="form-success" role="status">
        <strong>{t(locale, 'raffle.success')}</strong>
        <p>{t(locale, 'raffle.successText')}</p>
      </div>
    )
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>
          {t(locale, 'form.fullName')} {req}
        </span>
        <input name="fullName" type="text" required maxLength={200} autoComplete="name" />
      </label>

      <label className="field">
        <span>
          {t(locale, 'form.phone')} {req}
        </span>
        <input name="phone" type="tel" required maxLength={32} autoComplete="tel" />
      </label>

      <label className="field field-checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          {t(locale, 'form.consent')}{' '}
          <Link href={localeHref(locale, '/privacy')} prefetch={false} target="_blank">
            {t(locale, 'form.consentPolicy')}
          </Link>{' '}
          (152-ФЗ). {req}
        </span>
      </label>

      {status === 'error' && error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? t(locale, 'raffle.submitting') : t(locale, 'raffle.submit')}
      </button>
    </form>
  )
}
