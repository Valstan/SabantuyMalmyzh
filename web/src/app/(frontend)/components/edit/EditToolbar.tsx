'use client'

import React from 'react'

import { logoutUser } from '../../../../lib/me'
import { useAdminMode } from './AdminMode'

// Верхняя панель редактора (видна только залогиненному). Тумблер «Просмотр /
// Редактирование» (в «Просмотре» все inline-контролы скрыты — оцениваем вид сайта),
// выход, ссылка в админку на сложные правки. Рендерится в layout над сайтом; для
// гостя возвращает null → ноль сдвига вёрстки.
export const EditToolbar: React.FC = () => {
  const { isAdmin, mode, setMode, setIsAdmin } = useAdminMode()

  if (!isAdmin) return null

  const handleLogout = async () => {
    await logoutUser()
    setIsAdmin(false)
  }

  return (
    <div className={`edit-bar edit-bar--${mode}`} role="region" aria-label="Панель редактора">
      <div className="edit-bar__inner">
        <span className="edit-bar__brand" aria-hidden="true">✎ Редактор</span>
        <div className="edit-bar__modes" role="tablist" aria-label="Режим">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'view'}
            className={`edit-bar__mode${mode === 'view' ? ' is-active' : ''}`}
            onClick={() => setMode('view')}
          >
            Просмотр
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'manage'}
            className={`edit-bar__mode${mode === 'manage' ? ' is-active' : ''}`}
            onClick={() => setMode('manage')}
          >
            Редактирование
          </button>
        </div>
        <div className="edit-bar__actions">
          <a href="/admin" className="edit-bar__link" target="_blank" rel="noreferrer">
            Админка ↗
          </a>
          <button type="button" className="edit-bar__link" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}
