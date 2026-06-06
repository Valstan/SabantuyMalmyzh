'use client'

import Link from 'next/link'
import { useState } from 'react'

// I6 «Подписка на анонс»: email + согласие 152-ФЗ → POST /api/subscribers.
// Зеркало RegistrationForm (тот же гейт согласия и обработка ошибок/дедупа).
type Status = 'idle' | 'submitting' | 'success' | 'error'

export function SubscribeForm() {
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
      setError('Без согласия на обработку персональных данных подписаться нельзя.')
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
        // Дедуп (unique email) → дружелюбное сообщение вместо сырого «duplicate».
        const msg = /unique|already|exist|duplicate/i.test(raw)
          ? 'Этот email уже подписан на анонс.'
          : raw || 'Не удалось оформить подписку. Попробуйте ещё раз.'
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
        <strong>Готово — вы подписаны!</strong>
        <p>Напомним о дате и программе праздника ближе к мероприятию.</p>
      </div>
    )
  }

  return (
    <form className="reg-form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Имя</span>
        <input name="name" type="text" maxLength={200} autoComplete="name" />
      </label>

      <label className="field">
        <span>
          Email <abbr title="обязательно">*</abbr>
        </span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
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
        {status === 'submitting' ? 'Подписываем…' : 'Напомнить о празднике'}
      </button>
    </form>
  )
}
