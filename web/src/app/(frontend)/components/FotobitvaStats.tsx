'use client'

import Link from 'next/link'
import { useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { localeHref } from '../../../lib/localeHref'
import type { BattlePhotoStat, FotobitvaStatsData } from './fotobitvaTypes'
import { LentaLightbox } from './LentaLightbox'
import type { LentaMedia } from './lentaTypes'

const MONTHS: Record<Locale, string[]> = {
  ru: ['', 'январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  tt: ['', 'гыйнвар', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
}

/** 'YYYY-MM' → «июнь 2026» по локали. */
function monthLabel(key: string, locale: Locale): string {
  const [y, m] = key.split('-').map(Number)
  const name = MONTHS[locale][m] || key
  return `${name} ${y}`
}

// Статистика «Фотобитвы»: месячный рейтинг фото (текущий месяц) + история по прошлым
// месяцам. Фото кликабельны — открывают конкретный кадр в лайтбоксе. Данные считает
// сервер (FotobitvaStatsView) из раундов; здесь только показ + лайтбокс.
export function FotobitvaStats({ data, locale }: { data: FotobitvaStatsData; locale: Locale }) {
  // Открытый в лайтбоксе кадр (одно фото) — { media, authorName } | null.
  const [open, setOpen] = useState<{ media: LentaMedia[]; authorName: string | null } | null>(null)

  const openPhoto = (p: BattlePhotoStat) =>
    setOpen({
      media: [{ kind: 'photo', mediaUrl: p.mediaUrl, posterUrl: null, width: null, height: null }],
      authorName: p.authorName,
    })

  if (data.totalRounds === 0) {
    return (
      <div className="fb-stats">
        <div className="placeholder">{t(locale, 'fotobitva.empty')}</div>
        <p className="fb-back">
          <Link href={localeHref(locale, '/lenta')}>{t(locale, 'fotobitva.toLenta')}</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="fb-stats">
      {/* ── Текущий месяц ─────────────────────────────────────────────────── */}
      <section className="fb-block">
        <h3 className="fb-title">
          {t(locale, 'fotobitva.currentTop')} — <span className="fb-month">{monthLabel(data.currentMonth, locale)}</span>
        </h3>
        {data.current.length > 0 ? (
          <Board photos={data.current} locale={locale} onOpen={openPhoto} />
        ) : (
          <p className="fb-note">{t(locale, 'fotobitva.currentEmpty')}</p>
        )}
      </section>

      {/* ── История по месяцам ────────────────────────────────────────────── */}
      {data.history.length > 0 && (
        <section className="fb-block">
          <h3 className="fb-title">{t(locale, 'fotobitva.history')}</h3>
          {data.history.map((h) => (
            <div key={h.month} className="fb-month-block">
              <h4 className="fb-month-title">{monthLabel(h.month, locale)}</h4>
              <Board photos={h.top} locale={locale} onOpen={openPhoto} />
            </div>
          ))}
        </section>
      )}

      <p className="fb-back">
        <Link href={localeHref(locale, '/lenta')}>{t(locale, 'fotobitva.toLenta')}</Link>
      </p>

      {open && (
        <LentaLightbox
          media={open.media}
          index={0}
          caption={null}
          authorName={open.authorName}
          locale={locale}
          onClose={() => setOpen(null)}
          onNavigate={() => {}}
        />
      )}
    </div>
  )
}

function Board({
  photos,
  locale,
  onOpen,
}: {
  photos: BattlePhotoStat[]
  locale: Locale
  onOpen: (p: BattlePhotoStat) => void
}) {
  return (
    <ol className="fb-board">
      {photos.map((p, i) => (
        <PhotoCard key={`${p.subId}:${p.idx}`} rank={i + 1} photo={p} locale={locale} onOpen={onOpen} />
      ))}
    </ol>
  )
}

function PhotoCard({
  rank,
  photo,
  locale,
  onOpen,
}: {
  rank: number
  photo: BattlePhotoStat
  locale: Locale
  onOpen: (p: BattlePhotoStat) => void
}) {
  const [broken, setBroken] = useState(false)
  return (
    <li className={`fb-card${rank <= 3 ? ` fb-card--top fb-card--${rank}` : ''}`}>
      <span className="fb-rank" aria-hidden="true">
        {rank}
      </span>
      <button type="button" className="fb-thumb" onClick={() => onOpen(photo)} aria-label={t(locale, 'fotobitva.openPhoto')}>
        {!broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.mediaUrl} alt={photo.authorName || ''} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="lenta-fallback" aria-hidden="true">
            📷
          </span>
        )}
      </button>
      <span className="fb-meta">
        <span className="fb-author">{photo.authorName || t(locale, 'rating.anon')}</span>
        <span className="fb-wins" title={t(locale, 'fotobitva.wins')}>
          ⚔️ {photo.wins}
          <span className="fb-shows"> / {photo.shows}</span>
        </span>
      </span>
    </li>
  )
}
