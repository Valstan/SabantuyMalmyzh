'use client'

import Link from 'next/link'
import { useState } from 'react'

import { COMPETITIONS } from '../../../../lib/competitions'
import { t, type Locale } from '../../../../lib/i18n'
import { localeHref } from '../../../../lib/localeHref'

type Props = {
  eventId: number
  eventTitle: string
  // I5: показывать выбор дисциплины (событие — состязание, category sport/kids).
  competitionMode?: boolean
  locale?: Locale
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function RegistrationForm({ eventId, eventTitle, competitionMode = false, locale = 'ru' }: Props) {
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

    const competitionType = String(data.get('competitionType') ?? '').trim()
    if (competitionMode && !competitionType) {
      setStatus('error')
      setError(t(locale, 'reg.pickDiscipline'))
      return
    }

    const payload = {
      event: eventId,
      fullName: String(data.get('fullName') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim() || undefined,
      competitionType: competitionType || undefined,
      participants: Number(data.get('participants') ?? 1),
      comment: String(data.get('comment') ?? '').trim() || undefined,
      consent: true,
    }

    try {
      const res = await fetch('/api/registrations', {
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
        <strong>{t(locale, 'reg.success')}</strong>
        <p>«{eventTitle}»</p>
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

      <label className="field">
        <span>{t(locale, 'form.email')}</span>
        <input name="email" type="email" maxLength={200} autoComplete="email" />
      </label>

      {competitionMode && (
        <label className="field">
          <span>
            {t(locale, 'form.discipline')} {req}
          </span>
          <select name="competitionType" required defaultValue="">
            <option value="" disabled>
              {t(locale, 'reg.pickDiscipline')}
            </option>
            {COMPETITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>
          {t(locale, 'form.participants')} {req}
        </span>
        <input name="participants" type="number" required min={1} defaultValue={1} />
      </label>

      <label className="field">
        <span>{t(locale, 'form.comment')}</span>
        <textarea name="comment" rows={3} maxLength={1000} />
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
        {status === 'submitting' ? t(locale, 'reg.submitting') : t(locale, 'reg.submit')}
      </button>
    </form>
  )
}
