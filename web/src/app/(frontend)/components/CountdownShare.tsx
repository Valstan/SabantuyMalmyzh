'use client'

import { useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { SITE_NAME, SITE_URL } from '../../../lib/site'

// «Поделись отсчётом» — вирусная открытка обратного отсчёта до Сабантуя.
// Механика челленджа: открытка PNG с ЖИВЫМИ цифрами на момент создания
// (можно подложить своё фото) + текст «А сколько осталось у тебя?» + ссылка
// на /otschet — там отсчёт продолжает тикать вживую (в самих постах соцсетей
// чужой JS не исполняется, поэтому «живой» вариант — только по ссылке).
// Кнопки — по образцу MyProgramActions (share / буфер / PNG / TG / VK / ОК).

const SHARE_PATH = '/otschet'

function split(ms: number) {
  let s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  return { d, h, m }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function CountdownShare({ targetIso, locale }: { targetIso: string; locale: Locale }) {
  const [copied, setCopied] = useState(false)
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const target = new Date(targetIso).getTime()
  // Каждая шара — со свежим cache-buster: соцсети кэшируют превью по URL,
  // уникальный параметр даёт свежий снимок в превью ссылки. Значение — в state
  // ПОСЛЕ монтирования: Date.now() в href при SSR-рендере дал бы hydration-mismatch.
  const [buster, setBuster] = useState('')
  useEffect(() => {
    setBuster(Date.now().toString(36))
  }, [])
  const shareUrl = () => `${SITE_URL}${SHARE_PATH}${buster ? `?s=${buster}` : ''}`

  const buildText = () => {
    const r = split(target - Date.now())
    const cd =
      r.d > 0 ? `${r.d} дн. ${r.h} ч. ${r.m} мин.` : r.h > 0 ? `${r.h} ч. ${r.m} мин.` : `${r.m} мин.`
    return t(locale, 'share.cd.text').replace('{cd}', cd)
  }

  // ── Открытка 1080×1350: фото пользователя (или фирменный фон) + отсчёт ──
  const drawCard = async (photoOverride?: HTMLImageElement | null): Promise<Blob | null> => {
    const bg = photoOverride !== undefined ? photoOverride : photo
    const W = 1080
    const H = 1350
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Фон: своё фото cover-фитом, иначе фирменный градиент с «полем тюльпанов».
    if (bg) {
      const scale = Math.max(W / bg.width, H / bg.height)
      const dw = bg.width * scale
      const dh = bg.height * scale
      ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh)
      // тёмная вуаль, чтобы цифры читались на любом фото
      ctx.fillStyle = 'rgba(12, 40, 24, 0.55)'
      ctx.fillRect(0, 0, W, H)
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0e3d24')
      g.addColorStop(1, '#1c5c38')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // «поле тюльпанов» по нижнему краю
      ctx.font = '64px system-ui, sans-serif'
      for (let i = 0; i < 12; i++) ctx.fillText('🌷', 24 + i * 90, H - 40 - (i % 3) * 34)
    }
    // золотая рамка
    ctx.strokeStyle = '#e8b53a'
    ctx.lineWidth = 10
    ctx.strokeRect(20, 20, W - 40, H - 40)

    ctx.textAlign = 'center'
    // шапка
    ctx.fillStyle = '#ffe9a8'
    ctx.font = '700 52px system-ui, sans-serif'
    ctx.fillText('🌷 САБАНТУЙ В МАЛМЫЖЕ 🌷', W / 2, 140)
    ctx.fillStyle = '#fff7e6'
    ctx.font = '600 44px system-ui, sans-serif'
    ctx.fillText('4 июля 2026 · Малмыж', W / 2, 210)

    ctx.font = '700 58px system-ui, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(t(locale, 'share.cd.cardHeading'), W / 2, 380)

    // ячейки дн/ч/мин
    const r = split(target - Date.now())
    const cells = [
      [String(r.d).padStart(2, '0'), locale === 'tt' ? 'көн' : 'дн.'],
      [String(r.h).padStart(2, '0'), locale === 'tt' ? 'сәг.' : 'ч.'],
      [String(r.m).padStart(2, '0'), 'мин.'],
    ]
    const cw = 270
    const gap = 45
    const totalW = cells.length * cw + (cells.length - 1) * gap
    let x = (W - totalW) / 2
    const cy = 460
    for (const [num, label] of cells) {
      ctx.fillStyle = 'rgba(255, 247, 230, 0.14)'
      ctx.strokeStyle = '#e8b53a'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.roundRect(x, cy, cw, 300, 28)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 150px system-ui, sans-serif'
      ctx.fillText(num, x + cw / 2, cy + 185)
      ctx.fillStyle = '#ffe9a8'
      ctx.font = '600 46px system-ui, sans-serif'
      ctx.fillText(label, x + cw / 2, cy + 260)
      x += cw + gap
    }

    // челлендж-строка + адрес
    ctx.fillStyle = '#fff7e6'
    ctx.font = '600 46px system-ui, sans-serif'
    ctx.fillText(t(locale, 'share.cd.cardChallenge'), W / 2, 900)
    ctx.fillStyle = '#ffe9a8'
    ctx.font = '700 50px system-ui, sans-serif'
    ctx.fillText(SITE_URL.replace(/^https?:\/\//, ''), W / 2, 985)
    ctx.fillStyle = 'rgba(255, 247, 230, 0.85)'
    ctx.font = '400 36px system-ui, sans-serif'
    ctx.fillText(SITE_NAME, W / 2, 1050)

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95))
  }

  const refreshPreview = async (img: HTMLImageElement | null) => {
    const blob = await drawCard(img)
    if (!blob) return
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(blob)
    })
  }

  const onPickPhoto = (file: File | null) => {
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setPhoto(img)
      void refreshPreview(img) // сразу показать открытку с выбранным фото
    }
    img.src = URL.createObjectURL(file)
  }

  const doPng = async () => {
    const blob = await drawCard()
    if (blob) downloadBlob(blob, 'sabantuy-otschet.png')
  }

  const doCopy = async () => {
    const full = `${buildText()}\n${shareUrl()}`
    try {
      await navigator.clipboard.writeText(full)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = full
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const doNativeShare = async () => {
    const text = buildText()
    const url = shareUrl()
    try {
      const blob = await drawCard()
      if (blob && navigator.canShare?.({ files: [new File([blob], 'sabantuy-otschet.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'sabantuy-otschet.png', { type: 'image/png' })],
          text: `${text}\n${url}`,
        })
        return
      }
      if (navigator.share) {
        await navigator.share({ title: SITE_NAME, text, url })
        return
      }
    } catch {
      return // отмена пользователем — не ошибка
    }
    doCopy()
  }

  const enc = encodeURIComponent
  const shareTg = () => `https://t.me/share/url?url=${enc(shareUrl())}&text=${enc(buildText())}`
  const shareVk = () => `https://vk.com/share.php?url=${enc(shareUrl())}&title=${enc(t(locale, 'share.cd.cardHeading'))}&comment=${enc(buildText())}`
  const shareOk = () => `https://connect.ok.ru/offer?url=${enc(shareUrl())}&title=${enc(buildText())}`

  return (
    <div className="cdshare" role="group" aria-label={t(locale, 'share.cd.label')}>
      <p className="cdshare-lead">{t(locale, 'share.cd.lead')}</p>
      <div className="cdshare-actions">
        <button type="button" className="chip myprog-chip" onClick={doNativeShare}>
          📲 {t(locale, 'share.cd.share')}
        </button>
        <button type="button" className="chip myprog-chip" onClick={doPng}>
          🖼 {t(locale, 'share.cd.png')}
        </button>
        <button type="button" className="chip myprog-chip" onClick={() => fileRef.current?.click()}>
          📷 {t(locale, 'share.cd.withPhoto')}
        </button>
        <button type="button" className="chip myprog-chip" onClick={doCopy}>
          {copied ? `✓ ${t(locale, 'share.cd.copied')}` : `📋 ${t(locale, 'share.cd.copy')}`}
        </button>
        {/* Соц-ссылки — только после монтирования: их href содержит живые минуты
            и cache-buster (Date.now()), при SSR это дало бы hydration-mismatch. */}
        {buster && (
          <>
            <a className="chip myprog-chip" href={shareTg()} target="_blank" rel="noopener noreferrer">
              Telegram
            </a>
            <a className="chip myprog-chip" href={shareVk()} target="_blank" rel="noopener noreferrer">
              ВКонтакте
            </a>
            <a className="chip myprog-chip" href={shareOk()} target="_blank" rel="noopener noreferrer">
              Одноклассники
            </a>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
      />
      {preview && (
        <figure className="cdshare-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={t(locale, 'share.cd.previewAlt')} />
          <figcaption>{t(locale, 'share.cd.previewHint')}</figcaption>
        </figure>
      )}
    </div>
  )
}
