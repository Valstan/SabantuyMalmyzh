'use client'

import Link from 'next/link'
import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'

// I6 «Подписка на анонс»: email + согласие 152-ФЗ → POST /api/subscribers (локализовано, I11).
type Status = 'idle' | 'submitting' | 'success' | 'error'

export function SubscribeForm({ locale = 'ru' }: { locale?: Locale }) {
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
      email: String(data.get('email') ?? '').trim(),
      name: String(data.get('name') ?? '').trim() || undefined,
      consent: true,
    }

    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const raw = body?.errors?.[0]?.message || ''
        const msg = /unique|already|exist|duplicate/i.test(raw)
          ? t(locale, 'subscribe.dup')
          : raw || t(locale, 'form.netError')
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

  if (status === 'success') {
    return (
      <div className="form-success" role="status">
        <strong>{t(locale, 'subscribe.success')}</strong>
        <p>{t(locale, 'subscribe.successText')}</p>
      </div>
    )
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>{t(locale, 'form.name')}</span>
        <input name="name" type="text" maxLength={200} autoComplete="name" />
      </label>

      <label className="field">
        <span>
          {t(locale, 'form.email')} <abbr title={t(locale, 'form.required')}>*</abbr>
        </span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>

      <label className="field field-checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          {t(locale, 'form.consent')}{' '}
          <Link href={localeHref(locale, '/privacy')} prefetch={false} target="_blank">
            {t(locale, 'form.consentPolicy')}
          </Link>{' '}
          (152-ФЗ). <abbr title={t(locale, 'form.required')}>*</abbr>
        </span>
      </label>

      {status === 'error' && error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? t(locale, 'subscribe.submitting') : t(locale, 'subscribe.submit')}
      </button>
    </form>
  )
}
