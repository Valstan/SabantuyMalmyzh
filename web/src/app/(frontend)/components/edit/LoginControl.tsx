'use client'

import React, { useEffect, useState } from 'react'

import { fetchMe, isAdminUser, loginUser } from '../../../../lib/me'
import { useAdminMode } from './AdminMode'
import { Modal } from './Modal'

// Постоянная кнопка входа в шапке. Гость → «Войти» открывает модалку email+пароль
// (POST /api/users/login), остаёмся на странице (без перехода в /admin); на успехе
// включается режим «Редактирование» → на страницах появляются inline-контролы.
// Залогиненный редактор → кнопка скрыта (выход — в верхней панели EditToolbar).
export const LoginControl: React.FC = () => {
  const { isAdmin, setIsAdmin, setMode } = useAdminMode()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Отразить уже залогиненного редактора при загрузке.
  useEffect(() => {
    let cancelled = false
    fetchMe().then((u) => {
      if (!cancelled && isAdminUser(u)) setIsAdmin(true)
    })
    return () => {
      cancelled = true
    }
  }, [setIsAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await loginUser(email.trim(), password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (!isAdminUser(result.user)) {
      setError('У этого аккаунта нет прав на редактирование сайта.')
      return
    }
    setIsAdmin(true)
    setMode('manage')
    setOpen(false)
    setEmail('')
    setPassword('')
  }

  // Залогинен — кнопку входа не показываем (управление — в верхней панели).
  if (isAdmin) return null

  return (
    <>
      <button type="button" className="edit-login-btn" onClick={() => setOpen(true)} title="Вход для редактора">
        Войти
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Вход для редактора"
        description="Войдите, чтобы редактировать содержимое прямо на сайте."
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={submitting}>
              Отмена
            </button>
            <button type="submit" form="edit-login-form" className="btn btn-gold" disabled={submitting}>
              {submitting ? 'Входим…' : 'Войти'}
            </button>
          </>
        }
      >
        <form id="edit-login-form" onSubmit={handleSubmit} className="edit-form">
          <label className="edit-field">
            <span className="edit-field__label">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="edit-input"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field__label">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="edit-input"
            />
          </label>
          {error ? <p className="edit-error">{error}</p> : null}
        </form>
      </Modal>
    </>
  )
}
