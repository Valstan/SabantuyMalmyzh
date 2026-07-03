'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import { SITE_URL } from '../../../lib/site'
import { Modal } from './edit/Modal'
import { ShareMenu } from './ShareMenu'

// «Поделиться мероприятием» из программы праздника: модалка с заготовками
// подписей (на выбор) и свободным редактированием текста — посетитель шарит
// любимое событие со своей подписью. Кнопки — по образцу MyProgramActions
// (системное «Поделиться» / буфер / Telegram / VK / ОК).

export type ShareEvent = {
  slug: string | null
  title: string
  venue: string | null
  startDate: string | null
}

const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

// Заготовки подписей: {title}/{time}/{day}/{venue} подставляются из события.
// Тон — «зови друзей», разный на выбор: личный, азартный, семейный, деловой.
const PRESETS_RU = [
  'Иду на Сабантуй в Малмыже! 🌷 Моё любимое в программе — «{title}» ({day}, {time}{venue}). Присоединяйся!',
  '🔥 Не пропусти: «{title}» — {day} в {time}{venue}. Сабантуй в Малмыже, будет жарко!',
  'Встречаемся на майдане! 😉 «{title}» в {time} — кто со мной? Вся программа Сабантуя на сайте.',
  'Всей семьёй едем на Сабантуй {day}! В программе — «{title}» ({time}{venue}) и ещё целый день праздника 🎉',
]
const PRESETS_TT = [
  'Малмыж Сабантуена барам! 🌷 Программада иң яратканым — «{title}» ({day}, {time}{venue}). Кушыл!',
  '🔥 Калдырма: «{title}» — {day}, {time}{venue}. Малмыжда Сабантуй!',
  'Мәйданда очрашабыз! 😉 «{title}» {time} сәгатьтә — кем минем белән?',
]

function fill(tpl: string, ev: ShareEvent): string {
  const time = ev.startDate ? timeFmt.format(new Date(ev.startDate)) : ''
  const day = ev.startDate ? dayFmt.format(new Date(ev.startDate)) : '4 июля'
  return tpl
    .replace('{title}', ev.title)
    .replace('{time}', time)
    .replace('{day}', day)
    .replace('{venue}', ev.venue ? `, ${ev.venue}` : '')
}

export function EventShare({
  event,
  locale,
  onClose,
}: {
  event: ShareEvent | null
  locale: Locale
  onClose: () => void
}) {
  const presets = locale === 'tt' ? PRESETS_TT : PRESETS_RU
  const [text, setText] = useState('')
  const [picked, setPicked] = useState(0)

  // Новое событие → первая заготовка в редактор.
  useEffect(() => {
    if (event) {
      setPicked(0)
      setText(fill(presets[0], event))
    }
    // presets стабильны по локали
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  if (!event) return null

  const url = event.slug
    ? `${SITE_URL}${localeHref(locale, `/events/${encodeURIComponent(event.slug)}`)}`
    : `${SITE_URL}${localeHref(locale, '/#program')}`

  const pick = (i: number) => {
    setPicked(i)
    setText(fill(presets[i], event))
  }

  return (
    <Modal open onClose={onClose} title={t(locale, 'evshare.title')} description={event.title}>
      <div className="evshare">
        <p className="evshare-hint">{t(locale, 'evshare.pickHint')}</p>
        <div className="evshare-presets">
          {presets.map((tpl, i) => (
            <button
              key={i}
              type="button"
              className={`evshare-preset${picked === i ? ' active' : ''}`}
              aria-pressed={picked === i}
              onClick={() => pick(i)}
            >
              {fill(tpl, event)}
            </button>
          ))}
        </div>
        <label className="evshare-label">
          {t(locale, 'evshare.editLabel')}
          <textarea
            className="evshare-text"
            rows={4}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <p className="evshare-url">🔗 {url.replace(/^https?:\/\//, '')}</p>
        <div className="evshare-actions">
          <ShareMenu locale={locale} title={event.title} getText={() => text.trim()} url={url} />
        </div>
      </div>
    </Modal>
  )
}
