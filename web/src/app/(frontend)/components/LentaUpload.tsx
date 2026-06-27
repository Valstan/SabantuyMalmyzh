'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import {
  computePhase,
  measureAndPrepare,
  uploadSubmission,
  UploadError,
  type Prepared,
} from '../../../lib/ugcClient'
import { Modal } from './edit/Modal'
import { LentaCamera } from './LentaCamera'
import type { LentaItem } from './lentaTypes'

type Status = 'idle' | 'ready' | 'uploading' | 'success' | 'error'

// Загрузка фото/видео в «Народную ленту» (PR5). Файл выбирается камерой/галереей,
// валидируется и (для фото) ужимается на клиенте, грузится presigned-PUT'ом НАПРЯМУЮ
// в Object Storage (минуя наш бокс), затем создаётся запись. onUploaded — оптимистично
// показать новый кадр сразу (лента ISR, серверное появление ≤30с).
export function LentaUpload({ locale, onUploaded }: { locale: Locale; onUploaded: (item: LentaItem) => void }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errCode, setErrCode] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [prepared, setPrepared] = useState<Prepared | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [author, setAuthor] = useState('')
  const [consent, setConsent] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStatus('idle')
    setErrCode(null)
    setProgress(0)
    setPrepared(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
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

  // Общий путь для файла из камеры (LentaCamera) и из выбора файла: валидация/подготовка.
  async function handleFile(file: File) {
    setCameraOpen(false)
    setErrCode(null)
    try {
      const p = await measureAndPrepare(file)
      setPrepared(p)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(p.blob))
      setStatus('ready')
    } catch (err) {
      setPrepared(null)
      setStatus('error')
      setErrCode(err instanceof UploadError ? err.code : 'failed')
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  async function submit() {
    if (!prepared) return
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
      const { publicUrl, id } = await uploadSubmission(prepared, {
        caption: caption.trim(),
        authorName: author.trim(),
        phase,
        onProgress: setProgress,
      })
      onUploaded({
        id: id || Date.now(),
        kind: prepared.kind,
        mediaUrl: publicUrl,
        posterUrl: null,
        authorName: author.trim() || null,
        caption: caption.trim() || null,
        phase,
        likeCount: 0,
        commentCount: 0,
        width: prepared.width,
        height: prepared.height,
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

  return (
    <>
      <button type="button" className="btn-primary lenta-upload-btn" onClick={() => setOpen(true)}>
        📷 {t(locale, 'lenta.upload.button')}
      </button>

      <Modal open={open} onClose={close} title={t(locale, 'lenta.upload.title')}>
        {status === 'success' ? (
          <p className="lenta-upload-success">{t(locale, 'lenta.upload.success')}</p>
        ) : cameraOpen ? (
          <LentaCamera locale={locale} onCaptured={handleFile} onCancel={() => setCameraOpen(false)} />
        ) : (
          <div className="lenta-upload-form">
            <div className="lenta-upload-sources">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCameraOpen(true)}
                disabled={status === 'uploading'}
              >
                📷 {t(locale, 'lenta.cam.open')}
              </button>
              <label className="lenta-upload-filebtn">
                {t(locale, 'lenta.upload.pick')}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={onPick}
                  disabled={status === 'uploading'}
                  aria-label={t(locale, 'lenta.upload.pick')}
                />
              </label>
            </div>
            <p className="lenta-upload-hint">{t(locale, 'lenta.upload.hint')}</p>

            {previewUrl && prepared && (
              <div className="lenta-upload-preview">
                {prepared.kind === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" />
                ) : (
                  <video src={previewUrl} controls playsInline />
                )}
              </div>
            )}

            <label className="lenta-upload-field">
              <span>{t(locale, 'lenta.upload.caption')}</span>
              <textarea
                value={caption}
                maxLength={500}
                rows={2}
                onChange={(e) => setCaption(e.target.value)}
                disabled={status === 'uploading'}
              />
            </label>
            <label className="lenta-upload-field">
              <span>{t(locale, 'lenta.upload.author')}</span>
              <input
                type="text"
                value={author}
                maxLength={64}
                onChange={(e) => setAuthor(e.target.value)}
                disabled={status === 'uploading'}
              />
            </label>

            <label className="lenta-upload-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={status === 'uploading'}
              />
              <span>
                {t(locale, 'lenta.upload.consent')}{' '}
                <Link href={localeHref(locale, '/privacy')} target="_blank" prefetch={false}>
                  {t(locale, 'form.consentPolicy')}
                </Link>
              </span>
            </label>

            {status === 'uploading' && (
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
              disabled={!prepared || !consent || status === 'uploading'}
            >
              {status === 'uploading' ? t(locale, 'lenta.upload.uploading') : t(locale, 'lenta.upload.submit')}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
