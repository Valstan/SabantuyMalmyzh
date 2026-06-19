'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Locale } from '../../../../lib/i18n'
import { hasUnsupportedNodes, htmlToLexical, lexicalToHtml } from '../../../../lib/lexical-lite'
import { useAdminMode } from './AdminMode'
import { InlineImage } from './InlineImage'
import { LiteRichTextEditor } from './LiteRichTextEditor'
import { Modal } from './Modal'

type RawMedia =
  | number
  | string
  | { id?: number | string; url?: string | null; sizes?: Record<string, { url?: string | null } | undefined> }
  | null
  | undefined
type RawPage = { id: number | string; title?: string; content?: unknown; heroImage?: RawMedia }

function mediaIdOf(v: RawMedia): string | null {
  if (v == null) return null
  if (typeof v === 'object') return v.id == null ? null : String(v.id)
  return String(v)
}

/** Реальный URL раздачи media из populated-объекта (depth≥1) — по имени файла. */
function mediaUrlOf(v: RawMedia): string | null {
  if (v && typeof v === 'object') return v.sizes?.card?.url || v.url || null
  return null
}

/**
 * On-site редактор статической страницы (Pages). Виден редактору в режиме
 * «Редактирование». Правит заголовок, тело (richText с inline-картинками) и обложку.
 *
 * Локаль из пути (ru на /, tt на /tt) пробрасывается с сервера — читаем/пишем с
 * ?locale. Round-trip без потерь: GET ?depth=0 (связи как id) → меняем → PATCH весь
 * content + _status:'published' (Pages версионируется — иначе уйдёт в черновик).
 * Сложный content (block/relationship) → правка тела недоступна, шлём в админку.
 */
export const PageEditor: React.FC<{ id: number | string; title: string; locale: Locale }> = ({
  id,
  title: initialTitle,
  locale,
}) => {
  const { isAdmin, mode } = useAdminMode()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialTitle)
  const [bodyHtml, setBodyHtml] = useState('')
  const [bodyUnsupported, setBodyUnsupported] = useState(false)
  const [hasBody, setHasBody] = useState(true)
  const [heroId, setHeroId] = useState<string | null>(null)
  const [heroUrl, setHeroUrl] = useState<string | null>(null)

  const openEditor = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    setTitle(initialTitle)
    try {
      // depth=1: upload-узлы внутри content и heroImage приходят populated (с реальным
      // url по имени файла). При сохранении htmlToLexical пишет value как bare id.
      const res = await fetch(`/api/pages/${id}?depth=1&locale=${locale}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Не удалось загрузить страницу (${res.status})`)
      const page = (await res.json()) as RawPage
      const content = page.content
      const unsupported = hasUnsupportedNodes(content)
      setBodyUnsupported(unsupported)
      setHasBody(content != null)
      setBodyHtml(unsupported ? '' : lexicalToHtml(content))
      setHeroId(mediaIdOf(page.heroImage))
      setHeroUrl(mediaUrlOf(page.heroImage))
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      // Целочисленный PK media → отправляем heroImage числом (строка id отвергается).
      const heroValue = heroId == null ? null : /^\d+$/.test(heroId) ? Number(heroId) : heroId
      const body: Record<string, unknown> = {
        title: title.trim() || initialTitle,
        heroImage: heroValue,
        _status: 'published',
      }
      // Тело пишем, только если оно поддерживается (иначе не трогаем — в админке).
      if (!bodyUnsupported) body.content = htmlToLexical(bodyHtml)

      const res = await fetch(`/api/pages/${id}?locale=${locale}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Не удалось сохранить (${res.status}): ${txt.slice(0, 200)}`)
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(String((e as Error).message || e))
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin || mode !== 'manage') return null

  return (
    <div className="edit-actionbar">
      <button type="button" className="edit-edit-btn" onClick={openEditor}>
        ✎ Редактировать страницу{locale === 'tt' ? ' (татарча)' : ''}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактирование страницы"
        description="Заголовок, текст и картинки. Сложные блоки — в админке."
        wide
        footer={
          <>
            <button type="button" className="edit-btn" onClick={() => setOpen(false)} disabled={saving}>
              Отмена
            </button>
            <button type="button" className="btn btn-gold" onClick={save} disabled={saving || loading}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </>
        }
      >
        {loading ? (
          <p className="edit-muted">Загружаем…</p>
        ) : (
          <div className="edit-form">
            <label className="edit-field">
              <span className="edit-field__label">Заголовок</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="edit-input" />
            </label>

            <div className="edit-field">
              <span className="edit-field__label">Обложка страницы</span>
              <InlineImage
                previewUrl={heroUrl}
                alt={title}
                allowRemove
                onChange={(mid, url) => {
                  setHeroId(mid)
                  setHeroUrl(url)
                }}
                onError={setError}
              />
            </div>

            <div className="edit-field">
              <span className="edit-field__label">Текст страницы</span>
              {bodyUnsupported ? (
                <p className="edit-warn">
                  Этот текст содержит сложное форматирование — правьте в админке, чтобы не потерять.
                </p>
              ) : !hasBody ? (
                <>
                  <p className="edit-muted">Текста пока нет — добавьте ниже.</p>
                  <LiteRichTextEditor initialHtml="<p><br></p>" onChange={setBodyHtml} onError={setError} />
                </>
              ) : (
                <LiteRichTextEditor initialHtml={bodyHtml} onChange={setBodyHtml} onError={setError} />
              )}
            </div>

            {error ? <p className="edit-error">{error}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
