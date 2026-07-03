import type { Payload } from 'payload'

import { pushCampaignActive, pushConfigured, sendPushToAll } from './push'

// Серверный тикер уведомлений программы: «скоро начнётся событие». Запускается
// из payload.config onInit (один setInterval на процесс; в prod Payload
// инициализируется первым же запросом — деплой-смоук бьёт «/» сразу после
// рестарта) и раз в минуту смотрит расписание.
//
// Дедуп БЕЗ хранения состояния: событие уведомляется, когда его старт попадает
// в окно (now + LEAD − TICK, now + LEAD] — при тике раз в TICK каждое событие
// попадает в окно ровно один раз (рестарт на границе окна может дать повтор —
// одинаковый tag слипает уведомления на устройстве). События, стартующие в одну
// минуту, собираются в ОДНО уведомление (4 июля в 10:00 стартуют сразу три).

const TICK_MS = 60_000
const LEAD_MS = 10 * 60_000 // предупреждаем за ~10 минут

const timeFmt = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
})

export async function pushTickOnce(payload: Payload, now = Date.now()): Promise<void> {
  if (!pushConfigured() || !pushCampaignActive()) return
  const windowStart = new Date(now + LEAD_MS - TICK_MS)
  const windowEnd = new Date(now + LEAD_MS)
  const res = await payload.find({
    collection: 'events',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { startDate: { greater_than: windowStart.toISOString() } },
        { startDate: { less_than_equal: windowEnd.toISOString() } },
      ],
    },
    sort: 'startDate',
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  if (res.docs.length === 0) return

  const first = res.docs[0]
  const at = first.startDate ? timeFmt.format(new Date(String(first.startDate))) : ''
  const line = (e: (typeof res.docs)[number]) =>
    [e.title, e.venue ? `(${e.venue})` : ''].filter(Boolean).join(' ')
  const single = res.docs.length === 1
  await sendPushToAll(payload, {
    title: single ? `Скоро начнётся — в ${at}` : `Скоро в программе — в ${at}`,
    body: res.docs.map(line).join(' · '),
    url: single && first.slug ? `/events/${first.slug}` : '/#program',
    tag: `sabantuy-program-${first.startDate ?? at}`,
  })
}

let started = false

// Идемпотентный старт тикера (onInit может позваться повторно в dev/HMR).
export function startPushTicker(payload: Payload): void {
  if (started) return
  started = true
  if (!pushConfigured()) return
  payload.logger.info('[push] program ticker started (60s)')
  setInterval(() => {
    void pushTickOnce(payload).catch(() => {
      /* транзиентный сбой БД/сети — следующий тик через минуту */
    })
  }, TICK_MS)
}
