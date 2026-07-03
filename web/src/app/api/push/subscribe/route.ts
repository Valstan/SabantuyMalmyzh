import { NextResponse } from 'next/server'

import { pushCampaignActive, pushConfigured } from '../../../../lib/push'
import { getPayloadClient } from '../../../../lib/ugcOwner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Сохранить/обновить push-подписку браузера (upsert по endpoint). Подписка
// ЕДИНАЯ — на все уведомления сайта. Коллекция закрыта для прямого REST
// (#015) — пишем локальным API после валидации. После конца сезонной
// кампании (7 июля) подписка не оформляется → 410.
type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  locale?: string
}

const isHttpsUrl = (s: string) => {
  try {
    return new URL(s).protocol === 'https:'
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  if (!pushConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  if (!pushCampaignActive()) return NextResponse.json({ error: 'campaign_ended' }, { status: 410 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const endpoint = body.subscription?.endpoint
  const p256dh = body.subscription?.keys?.p256dh
  const auth = body.subscription?.keys?.auth
  if (
    !endpoint || typeof endpoint !== 'string' || endpoint.length > 1024 || !isHttpsUrl(endpoint) ||
    !p256dh || typeof p256dh !== 'string' || p256dh.length > 256 ||
    !auth || typeof auth !== 'string' || auth.length > 128
  ) {
    return NextResponse.json({ error: 'bad_subscription' }, { status: 400 })
  }
  const locale = body.locale === 'tt' ? 'tt' : 'ru'

  const payload = await getPayloadClient()
  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: { endpoint: { equals: endpoint } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    await payload.update({
      collection: 'push-subscriptions',
      id: existing.docs[0].id as number,
      data: { p256dh, auth, locale },
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'push-subscriptions',
      data: { endpoint, p256dh, auth, locale },
      overrideAccess: true,
    })
  }
  return NextResponse.json({ ok: true })
}
