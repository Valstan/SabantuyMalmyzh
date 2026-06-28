'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { recordBattle } from '../../../lib/ugcClient'
import type { LentaItem } from './lentaTypes'

type Pair = { a: LentaItem; b: LentaItem } | null

// Выбрать пару разных фото случайно, по возможности отличную от предыдущей.
function pickTwo(photos: LentaItem[], avoid?: Pair): Pair {
  if (photos.length < 2) return null
  for (let attempt = 0; attempt < 8; attempt++) {
    const i = Math.floor(Math.random() * photos.length)
    let j = Math.floor(Math.random() * photos.length)
    if (j === i) j = (j + 1) % photos.length
    const a = photos[i]
    const b = photos[j]
    if (
      avoid &&
      ((avoid.a.id === a.id && avoid.b.id === b.id) || (avoid.a.id === b.id && avoid.b.id === a.id))
    ) {
      continue
    }
    return { a, b }
  }
  return { a: photos[0], b: photos[1] }
}

// Игра «Фотобитва»: два случайных фото из «Народной ленты», посетитель выбирает, какое
// больше нравится. Победитель набирает battleWins (ОТДЕЛЬНО от лайков ленты). Начать и
// выйти можно в любой момент. Пары берутся из уже загруженных фото ленты (без серверных
// round-trip на каждую пару) — на выбор уходит только лёгкий POST результата.
export function PhotoBattle({
  photos,
  locale,
  onClose,
}: {
  photos: LentaItem[]
  locale: Locale
  onClose: () => void
}) {
  const [pair, setPair] = useState<Pair>(() => pickTwo(photos))
  const [rounds, setRounds] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Esc закрывает + scroll-lock + фокус на «Выход».
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const choose = useCallback(
    (winner: LentaItem, loser: LentaItem) => {
      if (picked !== null) return // уже выбрали в этом раунде — ждём следующую пару
      setPicked(winner.id)
      void recordBattle(winner.id, loser.id)
      window.setTimeout(() => {
        setRounds((r) => r + 1)
        setPicked(null)
        setPair((prev) => pickTwo(photos, prev))
      }, 480)
    },
    [photos, picked],
  )

  const bar = (
    <div className="battle-bar">
      <span className="battle-logo">⚔️ {t(locale, 'battle.title')}</span>
      {pair && (
        <span className="battle-rounds">
          {t(locale, 'battle.rounds')}: {rounds}
        </span>
      )}
      <button ref={closeRef} type="button" className="battle-exit" onClick={onClose}>
        {t(locale, 'battle.exit')}
      </button>
    </div>
  )

  if (!pair) {
    return (
      <div className="battle" role="dialog" aria-modal="true" aria-label={t(locale, 'battle.title')}>
        {bar}
        <div className="battle-empty">{t(locale, 'battle.tooFew')}</div>
      </div>
    )
  }

  const card = (item: LentaItem, opponent: LentaItem) => (
    <button
      type="button"
      className={`battle-card${picked === item.id ? ' is-picked' : ''}${
        picked !== null && picked !== item.id ? ' is-dim' : ''
      }`}
      onClick={() => choose(item, opponent)}
      aria-label={t(locale, 'battle.choose')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.mediaUrl} alt={item.caption || item.authorName || ''} loading="eager" />
      {item.authorName && <span className="battle-author">{item.authorName}</span>}
    </button>
  )

  return (
    <div className="battle" role="dialog" aria-modal="true" aria-label={t(locale, 'battle.title')}>
      {bar}
      <p className="battle-q">{t(locale, 'battle.prompt')}</p>
      <div className="battle-arena">
        {card(pair.a, pair.b)}
        <span className="battle-vs" aria-hidden="true">
          VS
        </span>
        {card(pair.b, pair.a)}
      </div>
    </div>
  )
}
