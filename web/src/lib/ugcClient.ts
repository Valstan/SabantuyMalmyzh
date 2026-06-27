import { FESTIVAL_DATE } from './festival'
import type { UgcKind, UgcPhase } from './ugc'

// Клиентские утилиты загрузки «Народной ленты» (PR5). Только браузер: валидация,
// даунскейл фото (canvas, экономия egress на слабом боксе), измерение видео,
// presigned-PUT напрямую в Object Storage (минуя наш бокс), создание записи.
//
// Лимиты — UX-предпроверка; СЕРВЕР перепроверяет на sign-upload и create (источник
// правды). Значения совпадают с дефолтами сервера (lib/ugc / sign-upload route).
export const CLIENT_MAX_PHOTO_MB = 12
export const CLIENT_MAX_VIDEO_MB = 100
export const CLIENT_MAX_VIDEO_SEC = 60
const MAX_IMAGE_DIM = 1600 // даунскейл больших фото до этого по длинной стороне

// Коды ошибок (UI маппит в i18n-сообщения — без Cyrillic в lib).
export type UploadErrorCode = 'bad_type' | 'too_large' | 'too_long' | 'degraded' | 'failed'
export class UploadError extends Error {
  code: UploadErrorCode
  constructor(code: UploadErrorCode) {
    super(code)
    this.code = code
  }
}

const PHOTO_MIME = /^image\/(jpeg|png|webp|heic|heif)$/
const VIDEO_MIME = /^video\/(mp4|quicktime|webm)$/

/** Базовый MIME без `;codecs=…` (MediaRecorder отдаёт полную строку). */
export function baseMime(type: string): string {
  return (type || '').split(';')[0].trim().toLowerCase()
}

/** Лучший поддерживаемый MIME для MediaRecorder. mp4/h264 — первым ради совместимости
 *  с iOS (vp8/vp9 webm Safari не проигрывает). undefined → встроенный дефолт. */
export function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'video/mp4',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c
    } catch {
      /* ignore */
    }
  }
  return undefined
}

/** Тип файла → kind, либо null если не поддерживается. */
export function kindOf(file: File): UgcKind | null {
  if (PHOTO_MIME.test(file.type)) return 'photo'
  if (VIDEO_MIME.test(file.type)) return 'video'
  return null
}

/** Фаза по дате (до праздника — подготовка, в день и после — праздник). */
export function computePhase(now: Date = new Date()): UgcPhase {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return today < FESTIVAL_DATE ? 'preparation' : 'festival'
}

export type Prepared = {
  kind: UgcKind
  blob: Blob
  mime: string
  bytes: number
  width: number | null
  height: number | null
  durationSec: number | null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

// Фото: если длинная сторона > MAX_IMAGE_DIM — ужать через canvas в JPEG (q0.85),
// иначе отдать исходник. Если декодировать не удалось (напр. HEIC на iOS без
// поддержки canvas) — грузим исходник как есть (размеры неизвестны).
async function prepareImage(file: File): Promise<{ blob: Blob; width: number | null; height: number | null }> {
  try {
    const img = await loadImage(file)
    const { naturalWidth: w0, naturalHeight: h0 } = img
    if (Math.max(w0, h0) <= MAX_IMAGE_DIM) return { blob: file, width: w0, height: h0 }
    const scale = MAX_IMAGE_DIM / Math.max(w0, h0)
    const w = Math.round(w0 * scale)
    const h = Math.round(h0 * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return { blob: file, width: w0, height: h0 }
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob) return { blob: file, width: w0, height: h0 }
    return { blob, width: w, height: h }
  } catch {
    return { blob: file, width: null, height: null }
  }
}

function measureVideo(file: File): Promise<{ durationSec: number; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve({
        durationSec: Number.isFinite(v.duration) ? Math.round(v.duration) : 0,
        width: v.videoWidth || null,
        height: v.videoHeight || null,
      })
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ durationSec: 0, width: null, height: null })
    }
    v.src = url
  })
}

/** Валидация + подготовка файла (даунскейл/измерение). Бросает UploadError. */
export async function measureAndPrepare(file: File): Promise<Prepared> {
  const kind = kindOf(file)
  if (!kind) throw new UploadError('bad_type')

  if (kind === 'photo') {
    const { blob, width, height } = await prepareImage(file)
    if (blob.size > CLIENT_MAX_PHOTO_MB * 1024 * 1024) throw new UploadError('too_large')
    return { kind, blob, mime: blob.type || file.type, bytes: blob.size, width, height, durationSec: null }
  }

  const { durationSec, width, height } = await measureVideo(file)
  if (durationSec > CLIENT_MAX_VIDEO_SEC) throw new UploadError('too_long')
  if (file.size > CLIENT_MAX_VIDEO_MB * 1024 * 1024) throw new UploadError('too_large')
  return { kind, blob: file, mime: file.type, bytes: file.size, width, height, durationSec }
}

function putWithProgress(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (frac: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new UploadError('failed'))
    xhr.onerror = () => reject(new UploadError('failed'))
    xhr.send(blob)
  })
}

export type UploadOpts = {
  caption: string
  authorName: string
  phase: UgcPhase
  onProgress: (frac: number) => void
}

export type UploadResult = { publicUrl: string; id: number }

// Полный цикл: presigned PUT-ссылка → прямой PUT в S3 (с прогрессом) → запись в
// коллекцию. Файл через наш Node НЕ идёт. Сервер 503 (ключи не заданы) → 'degraded'.
export async function uploadSubmission(prepared: Prepared, opts: UploadOpts): Promise<UploadResult> {
  const signRes = await fetch('/api/ugc/sign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: prepared.kind,
      contentType: prepared.mime,
      sizeBytes: prepared.bytes,
      phase: opts.phase,
    }),
  })
  if (signRes.status === 503) throw new UploadError('degraded')
  if (!signRes.ok) throw new UploadError('failed')
  const { uploadUrl, objectKey, publicUrl } = (await signRes.json()) as {
    uploadUrl: string
    objectKey: string
    publicUrl: string
  }

  await putWithProgress(uploadUrl, prepared.blob, prepared.mime, opts.onProgress)

  const subRes = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: prepared.kind,
      objectKey,
      mime: prepared.mime,
      bytes: prepared.bytes,
      phase: opts.phase,
      consent: true,
      authorName: opts.authorName || undefined,
      caption: opts.caption || undefined,
      width: prepared.width ?? undefined,
      height: prepared.height ?? undefined,
      durationSec: prepared.durationSec ?? undefined,
    }),
  })
  if (!subRes.ok) throw new UploadError('failed')
  const json = (await subRes.json()) as { doc?: { id?: number } }
  return { publicUrl, id: Number(json.doc?.id) || 0 }
}
