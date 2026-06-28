'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { recordBattle } from '../../../lib/ugcClient'
import type { BattlePhoto } from './lentaTypes'

type Pair = { a: BattlePhoto; b: BattlePhoto } | null

// Сессионная память показанных пар (НЕ между сессиями — решение владельца). sessionStorage
// живёт в пределах вкладки/визита, на новый заход сбрасывается → пары снова доступны.
const SEEN_KEY = 'battle-seen-pairs'

const photoKey = (p: BattlePhoto) => `${p.subId}:${p.idx}`
function pairKey(a: BattlePhoto, b: BattlePhoto): string {
  const ka = photoKey(a)
  const kb = photoKey(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}
function saveSeen(seen: Set<string>): void {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    /* приватный режим — дедуп только в памяти */
  }
}

// Выбрать пару разных фото, ещё НЕ показанную в этой сессии. null — все пары исчерпаны.
function pickFreshPair(photos: BattlePhoto[], seen: Set<string>): Pair {
  if (photos.length < 2) return null
  for (let attempt = 0; attempt < 30; attempt++) {
    const i = Math.floor(Math.random() * photos.length)
    let j = Math.floor(Math.random() * photos.length)
    if (j === i) j = (j + 1) % photos.length
    const a = photos[i]
    const b = photos[j]
    if (!seen.has(pairKey(a, b))) return Math.random() < 0.5 ? { a, b } : { a: b, b: a }
  }
  // Детерминированный добор: любая ещё не показанная пара.
  for (let i = 0; i < photos.length; i++) {
    for (let j = i + 1; j < photos.length; j++) {
      if (!seen.has(pairKey(photos[i], photos[j]))) return { a: photos[i], b: photos[j] }
    }
  }
  return null // все пары показаны в этой сессии
}

// Игра «Фотобитва»: два случайных фото из «Народной ленты» (КАЖДЫЙ кадр КАЖДОГО поста),
// посетитель выбирает, какое больше нравится. Победитель — конкретное фото (пост+индекс),
// набирает победы в МЕСЯЧНОМ рейтинге (статистика — отдельная страница). В одной сессии
// одна и та же пара не повторяется (sessionStorage); на новый заход — сброс.
export function PhotoBattle({
  photos,
  locale,
  onClose,
}: {
  photos: BattlePhoto[]
  locale: Locale
  onClose: () => void
}) {
  // seen — сессионная память показанных пар; ref, чтобы pick не пересоздавал колбэки.
  const seenRef = useRef<Set<string>>(new Set())
  const [pair, setPair] = useState<Pair>(null)
  const [rounds, setRounds] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Показать пару: пометить её показанной (сессия) и выставить в state.
  const showPair = useCallback((p: Pair) => {
    if (!p) {
      setExhausted(true)
      setPair(null)
      return
    }
    seenRef.current.add(pairKey(p.a, p.b))
    saveSeen(seenRef.current)
    setExhausted(false)
    setPair(p)
  }, [])

  // Старт: загрузить сессионную память и выбрать первую свежую пару.
  useEffect(() => {
    seenRef.current = loadSeen()
    showPair(pickFreshPair(photos, seenRef.current))
    // только на монтировании — последующие пары даёт choose/restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    (winner: BattlePhoto, loser: BattlePhoto) => {
      if (picked !== null) return // уже выбрали в этом раунде — ждём следующую пару
      setPicked(photoKey(winner))
      void recordBattle(winner.subId, winner.idx, loser.subId, loser.idx)
      window.setTimeout(() => {
        setRounds((r) => r + 1)
        setPicked(null)
        showPair(pickFreshPair(photos, seenRef.current))
      }, 480)
    },
    [photos, picked, showPair],
  )

  // «Начать заново» из состояния исчерпания: сбросить сессионную память пар.
  const restart = useCallback(() => {
    seenRef.current = new Set()
    saveSeen(seenRef.current)
    setRounds(0)
    setPicked(null)
    showPair(pickFreshPair(photos, seenRef.current))
  }, [photos, showPair])

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
        <div className="battle-empty">
          {exhausted ? (
            <>
              <p>{t(locale, 'battle.allSeen')}</p>
              <button type="button" className="btn-primary" onClick={restart}>
                {t(locale, 'battle.restart')}
              </button>
            </>
          ) : (
            t(locale, 'battle.tooFew')
          )}
        </div>
      </div>
    )
  }

  const card = (item: BattlePhoto, opponent: BattlePhoto) => {
    const key = photoKey(item)
    return (
      <button
        type="button"
        className={`battle-card${picked === key ? ' is-picked' : ''}${
          picked !== null && picked !== key ? ' is-dim' : ''
        }`}
        onClick={() => choose(item, opponent)}
        aria-label={t(locale, 'battle.choose')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.mediaUrl} alt={item.authorName || ''} loading="eager" />
        {item.authorName && <span className="battle-author">{item.authorName}</span>}
      </button>
    )
  }

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
