'use client'

import Link from 'next/link'
import { useState } from 'react'

// I4 «Розыгрыш призов»: ФИО + телефон + согласие 152-ФЗ → POST /api/raffle-entries.
// Зеркало RegistrationForm (тот же гейт согласия и обработка ошибок).
type Status = 'idle' | 'submitting' | 'success' | 'error'

export function RaffleForm({ raffleId }: { raffleId: number }) {
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
      setError('Без согласия на обработку персональных данных участвовать нельзя.')
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
        const msg = body?.errors?.[0]?.message || 'Не удалось подать заявку. Попробуйте ещё раз.'
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
        <strong>Вы в игре!</strong>
        <p>Заявка на розыгрыш принята. Победителя объявят организаторы в день праздника.</p>
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
        {status === 'submitting' ? 'Отправляем…' : 'Участвовать в розыгрыше'}
      </button>
    </form>
  )
}
