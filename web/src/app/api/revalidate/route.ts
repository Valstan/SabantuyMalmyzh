import { createHash, timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { safeRevalidatePath } from '../../../lib/safeRevalidate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Пост-деплойная ревалидация ВСЕГО дерева страниц (G32, поймано 2026-09-01).
//
// Зачем: `next build` в CI пререндерит 32 ISR-страницы против build-БД
// `sabantuy_build` — она ДОСТИЖИМА, но ПУСТА, поэтому запросы честно возвращают
// `[]`, пустой HTML едет в артефакте и висит на проде до первой ревалидации
// (30–300 с после первого запроса к каждой странице). Выглядит как регрессия
// того, что только что задеплоили. Лечение: сразу после рестарта деплой
// вызывает этот эндпоинт с бокса по loopback → `revalidatePath('/', 'layout')`
// сбрасывает всё дерево, первые запросы рендерятся уже против прод-БД.
//
// Секрет: REVALIDATE_SECRET генерируется САМИМ деплоем на боксе (openssl),
// живёт только в env-файле сервиса, в GitHub secrets и в vault не ходит —
// потерялся → следующий деплой сделает новый, ничего не зависит от его
// стабильности. Сравнение хэшей константным временем, чтобы не течь длиной.
// Без секрета в env → 503 (degraded, как SMTP/S3): эндпоинт «выключен», не «открыт».
export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) return NextResponse.json({ ok: false, reason: 'not-configured' }, { status: 503 })
  const given = req.headers.get('x-revalidate-secret') || ''
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  if (!timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 403 })
  safeRevalidatePath('/', 'layout')
  return NextResponse.json({ ok: true, revalidated: '/ (layout)' })
}
