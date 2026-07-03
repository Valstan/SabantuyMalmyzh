'use client'

import { t, type Locale } from '../../../lib/i18n'
import { SITE_NAME, SITE_URL } from '../../../lib/site'
import { ShareMenu } from './ShareMenu'

// Панель «Моя программа»: подсказка + экспорт отмеченных событий.
// Все выводы строятся из одного текстового представления (buildText):
// печать / PNG-картинка / .txt / буфер обмена / Telegram / VK / ОК /
// системное «Поделиться» (на телефоне открывает MAX, WhatsApp и т.д.).
export type MyProgramItem = {
  title: string
  startDate: string | null
  venue: string | null
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

function lines(items: MyProgramItem[]): string[] {
  return items.map((i) => {
    const time = i.startDate ? timeFmt.format(new Date(i.startDate)) : '—'
    return `${time} — ${i.title}${i.venue ? ` (${i.venue})` : ''}`
  })
}

function heading(items: MyProgramItem[], locale: Locale): string {
  const first = items.find((i) => i.startDate)?.startDate
  const day = first ? ` — ${dayFmt.format(new Date(first))}` : ''
  return `${t(locale, 'schedule.exportHeading')}${day}`
}

function buildText(items: MyProgramItem[], locale: Locale): string {
  return [`🎪 ${heading(items, locale)}`, '', ...lines(items), '', `${SITE_NAME}: ${SITE_URL}`].join('\n')
}

// Простой перенос строки по словам для canvas.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      out.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) out.push(cur)
  return out
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

export function MyProgramActions({ items, locale }: { items: MyProgramItem[]; locale: Locale }) {
  const text = () => buildText(items, locale)

  const doTxt = () => {
    downloadBlob(new Blob([text()], { type: 'text/plain;charset=utf-8' }), 'moya-programma-sabantuy.txt')
  }

  const doPng = () => {
    const W = 1080
    const pad = 64
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 1-й проход — посчитать высоту (заголовок + строки с переносами + подвал)
    ctx.font = '600 34px system-ui, sans-serif'
    const rows = lines(items).map((l) => wrapText(ctx, l, W - pad * 2))
    const rowH = 48
    const bodyH = rows.reduce((s, r) => s + r.length * rowH + 14, 0)
    const H = 96 + 72 + 40 + bodyH + 96
    canvas.width = W
    canvas.height = H
    // фон + рамка в цветах сайта
    ctx.fillStyle = '#fdf8ee'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#e8b53a'
    ctx.lineWidth = 6
    ctx.strokeRect(12, 12, W - 24, H - 24)
    // заголовок
    ctx.fillStyle = '#1c5c38'
    ctx.font = '700 44px system-ui, sans-serif'
    ctx.fillText('🎪 ' + heading(items, locale), pad, 110)
    ctx.fillStyle = '#e8b53a'
    ctx.fillRect(pad, 136, W - pad * 2, 4)
    // строки программы
    let y = 200
    ctx.font = '600 34px system-ui, sans-serif'
    for (const row of rows) {
      ctx.fillStyle = '#22323f'
      for (const line of row) {
        ctx.fillText(line, pad, y)
        y += rowH
      }
      y += 14
    }
    // подвал — адрес сайта
    ctx.fillStyle = '#1c5c38'
    ctx.font = '400 30px system-ui, sans-serif'
    ctx.fillText(`${SITE_NAME} · ${SITE_URL.replace(/^https?:\/\//, '')}`, pad, H - 52)
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'moya-programma-sabantuy.png')
    }, 'image/png')
  }

  const doPrint = () => {
    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) return
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    w.document.write(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${esc(heading(items, locale))}</title>` +
        `<style>body{font:16px/1.5 system-ui,sans-serif;color:#22323f;max-width:640px;margin:2rem auto;padding:0 1rem}` +
        `h1{color:#1c5c38;font-size:1.4rem;border-bottom:3px solid #e8b53a;padding-bottom:.5rem}` +
        `li{margin:.35rem 0}footer{margin-top:1.5rem;color:#1c5c38}</style></head><body>` +
        `<h1>🎪 ${esc(heading(items, locale))}</h1><ul>` +
        lines(items)
          .map((l) => `<li>${esc(l)}</li>`)
          .join('') +
        `</ul><footer>${esc(SITE_NAME)} · ${esc(SITE_URL)}</footer></body></html>`,
    )
    w.document.close()
    w.focus()
    // print после отрисовки; окно оставляем — пользователь закроет сам
    setTimeout(() => w.print(), 300)
  }

  // Все варианты — в компактной кнопке-списке (не захламляем панель рядом кнопок).
  return (
    <div className="myprog-actions" role="group" aria-label={t(locale, 'schedule.exportLabel')}>
      <span className="myprog-actions-label">{t(locale, 'schedule.exportLabel')}:</span>
      <ShareMenu
        locale={locale}
        title={heading(items, locale)}
        getText={text}
        url={SITE_URL}
        extra={[
          { label: `🖨 ${t(locale, 'schedule.exportPrint')}`, onClick: doPrint },
          { label: `🖼 ${t(locale, 'schedule.exportPng')}`, onClick: doPng },
          { label: `📄 ${t(locale, 'schedule.exportTxt')}`, onClick: doTxt },
        ]}
      />
    </div>
  )
}
