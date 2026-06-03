'use client'

import Link from 'next/link'
import { useState } from 'react'

type Props = {
  eventId: number
  eventTitle: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function RegistrationForm({ eventId, eventTitle }: Props) {
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
      setError('Без согласия на обработку персональных данных заявку отправить нельзя.')
      return
    }

    const payload = {
      event: eventId,
      fullName: String(data.get('fullName') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim() || undefined,
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
        const msg = body?.errors?.[0]?.message || 'Не удалось отправить заявку. Попробуйте ещё раз.'
        setStatus('error')
        setError(msg)
        return
      }

      form.reset()
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Сеть недоступна. Проверьте подключение и попробуйте ещё раз.')
    }
  }

  if (status === 'success') {
    return (
      <div className="form-success" role="status">
        <strong>Заявка отправлена!</strong>
        <p>Спасибо за регистрацию на «{eventTitle}». Организаторы свяжутся с вами при необходимости.</p>
        <button type="button" className="btn-link" onClick={() => setStatus('idle')}>
          Отправить ещё одну заявку
        </button>
      </div>
    )
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>
          ФИО <abbr title="обязательно">*</abbr>
        </span>
        <input name="fullName" type="text" required maxLength={200} autoComplete="name" />
      </label>

      <label className="field">
        <span>
          Телефон <abbr title="обязательно">*</abbr>
        </span>
        <input name="phone" type="tel" required maxLength={32} autoComplete="tel" />
      </label>

      <label className="field">
        <span>Email</span>
        <input name="email" type="email" maxLength={200} autoComplete="email" />
      </label>

      <label className="field">
        <span>
          Количество участников <abbr title="обязательно">*</abbr>
        </span>
        <input name="participants" type="number" required min={1} defaultValue={1} />
      </label>

      <label className="field">
        <span>Комментарий</span>
        <textarea name="comment" rows={3} maxLength={1000} />
      </label>

      <label className="field field-checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          Я даю согласие на обработку персональных данных в соответствии с{' '}
          <Link href="/privacy" prefetch={false} target="_blank">
            Политикой обработки персональных данных
          </Link>{' '}
          (152-ФЗ). <abbr title="обязательно">*</abbr>
        </span>
      </label>

      {status === 'error' && error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  )
}
