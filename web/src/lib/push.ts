import type { Payload } from 'payload'

// Отправка web-push уведомлений подписчикам (коллекция push-subscriptions).
// VAPID-ключи — ТОЛЬКО в рантайм-env прода (/etc/sabantuy/sabantuy.env,
// воркфлоу apply-push-secrets.yml); без них фича молча выключена (degraded,
// как S3/SMTP) — dev/CI собираются и работают без секретов.

export type PushTopic = 'news' | 'lenta'

export type PushMessage = {
  title: string
  body?: string
  /** Путь на сайте, куда ведёт клик по уведомлению (например /novosti/slug). */
  url: string
  /** Слипание одинаковых уведомлений (replace по tag). */
  tag?: string
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

// Рассылка по теме. Вызывается из afterChange-хуков БЕЗ await (fire-and-forget):
// публикация новости не должна ждать сотни HTTP-запросов к push-сервисам.
// Протухшие подписки (404/410 от push-сервиса) удаляем по ходу.
export async function sendPushToTopic(payload: Payload, topic: PushTopic, msg: PushMessage): Promise<void> {
  if (!pushConfigured()) return
  const { default: webpush } = await import('web-push')
  webpush.setVapidDetails(
    `mailto:${process.env.ORGANIZER_EMAIL || 'no-reply@sabantuy-malmyzh.ru'}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const topicField = topic === 'news' ? 'topicNews' : 'topicLenta'
  const subs = await payload.find({
    collection: 'push-subscriptions',
    where: { [topicField]: { equals: true } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  if (subs.docs.length === 0) return

  const body = JSON.stringify({
    title: msg.title,
    body: msg.body || '',
    url: msg.url,
    tag: msg.tag || `sabantuy-${topic}`,
  })

  // Пачками, чтобы не открывать сотни соединений разом.
  const CHUNK = 20
  let sent = 0
  let dropped = 0
  for (let i = 0; i < subs.docs.length; i += CHUNK) {
    const chunk = subs.docs.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: String(sub.endpoint),
              keys: { p256dh: String(sub.p256dh), auth: String(sub.auth) },
            },
            body,
            { TTL: 12 * 3600 },
          )
          sent += 1
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          // 404/410 — подписка мертва (браузер отписался/переустановлен) → чистим.
          if (status === 404 || status === 410) {
            dropped += 1
            await payload
              .delete({ collection: 'push-subscriptions', id: sub.id as number, overrideAccess: true })
              .catch(() => undefined)
          }
        }
      }),
    )
  }
  payload.logger.info(`[push] topic=${topic} sent=${sent} dropped=${dropped} of ${subs.docs.length}`)
}
