'use client'

import { createContext, useContext, useEffect, useState } from 'react'

import { fetchMyOwned } from '../../../lib/ugcClient'

// Контекст «моё по VK-аккаунту» (PR5B): множества id публикаций/комментов, закреплённых
// за вошедшим посетителем. Провайдер монтируется в ленте, один раз тянет /api/ugc/mine
// (и там же сервер присваивает прежний аноним-контент браузера аккаунту). Карточки и
// комменты добавляют это к localStorage-владению → бейдж «Ваше»/управление с ЛЮБОГО
// устройства. Без VK-сессии множества пусты — поведение как раньше (аноним по токену).
type Owned = { subs: Set<number>; comments: Set<number> }

const OwnedCtx = createContext<Owned>({ subs: new Set(), comments: new Set() })

export function OwnedProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<Owned>({ subs: new Set(), comments: new Set() })

  useEffect(() => {
    let alive = true
    fetchMyOwned()
      .then((d) => {
        if (alive) setOwned({ subs: new Set(d.submissions), comments: new Set(d.comments) })
      })
      .catch(() => {
        /* не вошёл / сеть — оставляем пусто */
      })
    return () => {
      alive = false
    }
  }, [])

  return <OwnedCtx.Provider value={owned}>{children}</OwnedCtx.Provider>
}

export const useOwned = () => useContext(OwnedCtx)
