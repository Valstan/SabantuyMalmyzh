'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import {
  CLIENT_MAX_FILES,
  computePhase,
  measureAndPrepare,
  uploadPost,
  UploadError,
  type Prepared,
} from '../../../lib/ugcClient'
import { Modal } from './edit/Modal'
import { LentaCamera } from './LentaCamera'
import type { LentaItem } from './lentaTypes'

type Status = 'idle' | 'uploading' | 'success' | 'error'

// Один выбранный файл в очереди поста (превью-blob URL живёт до отправки/сброса).
type Picked = { id: string; prepared: Prepared; previewUrl: string }

let pickSeq = 0
const nextPickId = () => `p${++pickSeq}`

// Загрузка фото/видео в «Народную ленту» — пост-в-стиле-ВК: одна подпись/имя/согласие,
// до CLIENT_MAX_FILES файлов. Файлы выбираются камерой/галереей (можно несколько за
// раз), валидируются и (фото) ужимаются на клиенте, грузятся presigned-PUT'ами НАПРЯМУЮ
// в Object Storage (минуя наш бокс), затем создаётся ОДНА запись. onUploaded —
// оптимистично показать новый пост сразу (лента ISR, серверное появление ≤30с).
export function LentaUpload({ locale, onUploaded }: { locale: Locale; onUploaded: (item: LentaItem) => void }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errCode, setErrCode] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [files, setFiles] = useState<Picked[]>([])
  const [caption, setCaption] = useState('')
  const [author, setAuthor] = useState('')
  const [consent, setConsent] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [vkName, setVkName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Имя вошедшего через VK — чтобы по умолчанию подписать пост его именем (а не «Аноним»).
  useEffect(() => {
    let alive = true
    fetch('/api/auth/vk/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { visitor?: { name?: string } | null }) => {
        if (alive && d?.visitor?.name) setVkName(d.visitor.name)
      })
      .catch(() => {
        /* не вошёл / сеть — поле автора останется ручным */
      })
    return () => {
      alive = false
    }
  }, [])

  // При открытии формы подставить имя из VK, если поле пустое (посетитель может стереть).
  useEffect(() => {
    if (open && vkName) setAuthor((a) => (a.trim() ? a : vkName))
  }, [open, vkName])

  function reset() {
    setStatus('idle')
    setErrCode(null)
    setProgress(0)
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      return []
    })
    setCaption('')
    setAuthor('')
    setConsent(false)
    setCameraOpen(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function close() {
    setOpen(false)
    reset()
  }

  // Добавить выбранные файлы в очередь (с учётом лимита CLIENT_MAX_FILES). Валидация/
  // подготовка каждого; негодные пропускаем, последнюю ошибку показываем. Общий путь
  // для файлов из камеры (LentaCamera, по одному) и из выбора файла (можно несколько).
  async function addFiles(list: FileList | File[]) {
    setCameraOpen(false)
    setErrCode(null)
    const arr = Array.from(list)
    const room = CLIENT_MAX_FILES - files.length
    if (room <= 0) {
      setErrCode('too_many')
      return
    }
    if (arr.length > room) setErrCode('too_many')
    for (const file of arr.slice(0, room)) {
      try {
        const p = await measureAndPrepare(file)
        const previewUrl = URL.createObjectURL(p.blob)
        setFiles((prev) =>
          prev.length >= CLIENT_MAX_FILES ? prev : [...prev, { id: nextPickId(), prepared: p, previewUrl }],
        )
      } catch (err) {
        setErrCode(err instanceof UploadError ? err.code : 'failed')
      }
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id)
      if (f) URL.revokeObjectURL(f.previewUrl)
      return prev.filter((x) => x.id !== id)
    })
    setErrCode(null)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (list && list.length) void addFiles(list)
    // сброс value — чтобы повторный выбор того же файла снова триггерил change
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (files.length === 0) return
    if (!consent) {
      setStatus('error')
      setErrCode('consent')
      return
    }
    setStatus('uploading')
    setErrCode(null)
    setProgress(0)
    const phase = computePhase()
    try {
      const { id, media } = await uploadPost(
        files.map((f) => f.prepared),
        { caption: caption.trim(), authorName: author.trim(), phase, onProgress: setProgress },
      )
      const cover = media[0]
      onUploaded({
        id: id || Date.now(),
        kind: cover.kind,
        mediaUrl: cover.mediaUrl,
        posterUrl: cover.posterUrl,
        media,
        authorName: author.trim() || null,
        caption: caption.trim() || null,
        phase,
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        width: cover.width,
        height: cover.height,
      })
      setStatus('success')
      window.setTimeout(close, 1600)
    } catch (err) {
      setStatus('error')
      setErrCode(err instanceof UploadError ? err.code : 'failed')
    }
  }

  const errText = errCode
    ? errCode === 'consent'
      ? t(locale, 'form.consent')
      : t(locale, `lenta.upload.err.${errCode}`)
    : null
  const atLimit = files.length >= CLIENT_MAX_FILES
  const busy = status === 'uploading'

  return (
    <>
      <button type="button" className="btn-primary lenta-upload-btn" onClick={() => setOpen(true)}>
        📷 {t(locale, 'lenta.upload.button')}
      </button>

      <Modal open={open} onClose={close} title={t(locale, 'lenta.upload.title')}>
        {status === 'success' ? (
          <p className="lenta-upload-success">{t(locale, 'lenta.upload.success')}</p>
        ) : cameraOpen ? (
          <LentaCamera locale={locale} onCaptured={(file) => void addFiles([file])} onCancel={() => setCameraOpen(false)} />
        ) : (
          <div className="lenta-upload-form">
            <div className="lenta-upload-sources">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCameraOpen(true)}
                disabled={busy || atLimit}
              >
                📷 {t(locale, 'lenta.cam.open')}
              </button>
              <label className={`lenta-upload-filebtn${busy || atLimit ? ' is-disabled' : ''}`}>
                {files.length > 0 ? t(locale, 'lenta.upload.addMore') : t(locale, 'lenta.upload.pick')}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onPick}
                  disabled={busy || atLimit}
                  aria-label={t(locale, 'lenta.upload.pick')}
                />
              </label>
            </div>
            <p className="lenta-upload-hint">
              {t(locale, 'lenta.upload.hint')} {t(locale, 'lenta.upload.limitHint')}
            </p>

            {files.length > 0 && (
              <>
                <div className="lenta-upload-count" aria-live="polite">
                  {files.length} / {CLIENT_MAX_FILES}
                </div>
                <ul className="lenta-upload-grid">
                  {files.map((f) => (
                    <li key={f.id} className="lenta-upload-thumb">
                      {f.prepared.kind === 'photo' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.previewUrl} alt="" />
                      ) : (
                        <video src={f.previewUrl} muted playsInline />
                      )}
                      {f.prepared.kind === 'video' && <span className="lenta-upload-thumb-badge" aria-hidden="true">🎬</span>}
                      {!busy && (
                        <button
                          type="button"
                          className="lenta-upload-thumb-remove"
                          onClick={() => removeFile(f.id)}
                          aria-label={t(locale, 'lenta.upload.remove')}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <label className="lenta-upload-field">
              <span>{t(locale, 'lenta.upload.caption')}</span>
              <textarea
                value={caption}
                maxLength={500}
                rows={2}
                onChange={(e) => setCaption(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="lenta-upload-field">
              <span>{t(locale, 'lenta.upload.author')}</span>
              <input
                type="text"
                value={author}
                maxLength={64}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={busy}
              />
            </label>

            <label className="lenta-upload-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={busy}
              />
              <span>
                {t(locale, 'lenta.upload.consent')}{' '}
                <Link href={localeHref(locale, '/privacy')} target="_blank" prefetch={false}>
                  {t(locale, 'form.consentPolicy')}
                </Link>
              </span>
            </label>

            {busy && (
              <div className="lenta-upload-progress" aria-live="polite">
                <div className="lenta-upload-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
                <span>{t(locale, 'lenta.upload.uploading')} {Math.round(progress * 100)}%</span>
              </div>
            )}
            {errText && <p className="lenta-upload-error" role="alert">{errText}</p>}

            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={files.length === 0 || !consent || busy}
            >
              {busy ? t(locale, 'lenta.upload.uploading') : t(locale, 'lenta.upload.submit')}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
