'use client'

import React, { useEffect, useRef, useState } from 'react'

import { uploadMedia } from '../../../../lib/me'
import { newNodeId } from '../../../../lib/lexical-lite'

// Лёгкий contentEditable-редактор с тулбаром: заголовки, Ж/К, списки, ссылка и
// **inline-картинки** (вставка/замена/удаление/выравнивание). Неуправляемый: HTML
// ставим в DOM один раз (иначе прыгает каретка), наверх отдаём innerHTML через onChange.
// Сериализация HTML↔Lexical — в lib/lexical-lite.ts. Калька с GONBA + наша работа с upload.

function buildUploadImg(mediaId: string, url: string): HTMLImageElement {
  const img = document.createElement('img')
  img.setAttribute('data-lexical-upload-id', mediaId)
  img.setAttribute('data-lexical-upload-relation-to', 'media')
  img.setAttribute('data-lexical-node-id', newNodeId())
  img.setAttribute('data-lexical-format', '')
  img.setAttribute('src', url) // реальный doc.url (по имени файла), не по id
  img.setAttribute('alt', '')
  img.className = 'edit-inline-img'
  return img
}

export const LiteRichTextEditor: React.FC<{
  initialHtml: string
  onChange: (html: string) => void
  onError?: (msg: string) => void
}> = ({ initialHtml, onChange, onError }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // null = вставка новой картинки; HTMLImageElement = замена выбранной
  const replaceTarget = useRef<HTMLImageElement | null>(null)
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null)
  const [busy, setBusy] = useState(false)

  // Инициализация HTML один раз (неуправляемый contentEditable).
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml || '<p><br></p>'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    emit()
  }

  const addLink = () => {
    const url = window.prompt('Адрес ссылки (URL):', 'https://')
    if (url) exec('createLink', url)
  }

  const insertBlock = (node: Node) => {
    const root = editorRef.current
    if (!root) return
    const sel = window.getSelection()
    let ref: Node | null = null
    if (sel && sel.rangeCount && sel.anchorNode && root.contains(sel.anchorNode)) {
      let n: Node | null = sel.anchorNode
      while (n && n.parentNode !== root) n = n.parentNode
      ref = n
    }
    if (ref && ref.nextSibling) root.insertBefore(node, ref.nextSibling)
    else root.appendChild(node)
    // гарантируем редактируемый абзац после картинки
    if (!node.nextSibling) {
      const p = document.createElement('p')
      p.innerHTML = '<br>'
      root.appendChild(p)
    }
    emit()
  }

  const pickFile = (target: HTMLImageElement | null) => {
    replaceTarget.current = target
    fileRef.current?.click()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const res = await uploadMedia(file)
    setBusy(false)
    if (!res) {
      onError?.('Не удалось загрузить изображение.')
      return
    }
    const target = replaceTarget.current
    if (target) {
      target.setAttribute('data-lexical-upload-id', res.id)
      target.setAttribute('src', res.url)
      emit()
    } else {
      insertBlock(buildUploadImg(res.id, res.url))
    }
    replaceTarget.current = null
  }

  const handleClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.tagName === 'IMG' && el.classList.contains('edit-inline-img')) {
      setSelectedImg(el as HTMLImageElement)
    } else {
      setSelectedImg(null)
    }
  }

  const alignSelected = (fmt: 'left' | 'center' | 'right') => {
    if (!selectedImg) return
    selectedImg.setAttribute('data-lexical-format', fmt)
    selectedImg.classList.remove('align-left', 'align-center', 'align-right')
    selectedImg.classList.add(`align-${fmt}`)
    emit()
  }

  const removeSelected = () => {
    if (!selectedImg) return
    selectedImg.remove()
    setSelectedImg(null)
    emit()
  }

  return (
    <div className="edit-rte-wrap">
      <div className="edit-rte-toolbar" role="toolbar" aria-label="Форматирование">
        {[
          { cmd: () => exec('formatBlock', 'H2'), label: 'H2', title: 'Заголовок' },
          { cmd: () => exec('formatBlock', 'H3'), label: 'H3', title: 'Подзаголовок' },
          { cmd: () => exec('formatBlock', 'P'), label: '¶', title: 'Абзац' },
          { cmd: () => exec('bold'), label: 'Ж', title: 'Жирный' },
          { cmd: () => exec('italic'), label: 'К', title: 'Курсив' },
          { cmd: () => exec('insertUnorderedList'), label: '•', title: 'Список' },
          { cmd: () => exec('insertOrderedList'), label: '1.', title: 'Нумерованный список' },
          { cmd: addLink, label: '🔗', title: 'Ссылка' },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            className="edit-rte-btn"
            title={b.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.cmd}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          className="edit-rte-btn"
          title="Вставить картинку"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pickFile(null)}
          disabled={busy}
        >
          🖼 {busy ? '…' : 'Картинка'}
        </button>
      </div>

      {selectedImg ? (
        <div className="edit-rte-imgbar" role="toolbar" aria-label="Выбранная картинка">
          <span className="edit-rte-imgbar__label">Картинка:</span>
          <button type="button" className="edit-rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => pickFile(selectedImg)} disabled={busy}>
            Заменить
          </button>
          <button type="button" className="edit-rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelected('left')} title="Влево">⬅</button>
          <button type="button" className="edit-rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelected('center')} title="По центру">⬜</button>
          <button type="button" className="edit-rte-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => alignSelected('right')} title="Вправо">➡</button>
          <button type="button" className="edit-link-danger" onMouseDown={(e) => e.preventDefault()} onClick={removeSelected}>
            удалить
          </button>
        </div>
      ) : null}

      <div
        ref={editorRef}
        className="edit-rte"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onClick={handleClick}
      />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  )
}
