import type { Where } from 'payload'

import { NextResponse } from 'next/server'

import { getPayloadClient, requestOwnerHash, requestVisitorId } from '../../../../lib/ugcOwner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// «Моё» для вошедшего через VK (PR5B). Возвращает id публикаций/комментов, закреплённых
// за аккаунтом (ownerVisitor) — чтобы клиент показал бейдж «Ваше» + управление С ЛЮБОГО
// устройства (а не только там, где лежит браузерный токен). Заодно ПРИСВАИВАЕТ прежний
// аноним-контент этого браузера: если есть X-UGC-Owner токен — проставляет ownerVisitor
// на записях с совпавшим ownerHash, у которых аккаунт-владельца ещё нет (гибрид:
// аноним-владение → VK-владение при входе). Без VK-сессии — пусто (аноним как раньше).
export async function POST(req: Request) {
  const visitorId = requestVisitorId(req.headers)
  if (!visitorId) return NextResponse.json({ submissions: [], comments: [] })

  const payload = await getPayloadClient()
  const ownerHash = requestOwnerHash(req.headers)

  // 1) claim: аноним-контент этого браузера → за аккаунт (только записи без ownerVisitor)
  if (ownerHash) {
    const claimWhere: Where = { and: [{ ownerHash: { equals: ownerHash } }, { ownerVisitor: { exists: false } }] }
    await Promise.all(
      (['submissions', 'submission-comments', 'submission-reactions'] as const).map((collection) =>
        payload
          .update({ collection, where: claimWhere, data: { ownerVisitor: visitorId }, overrideAccess: true })
          .catch(() => undefined),
      ),
    )
  }

  // 2) собрать id, закреплённые за аккаунтом
  const [subs, comments] = await Promise.all([
    payload.find({
      collection: 'submissions',
      where: { ownerVisitor: { equals: visitorId } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'submission-comments',
      where: { ownerVisitor: { equals: visitorId } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  return NextResponse.json({
    submissions: subs.docs.map((d) => d.id as number),
    comments: comments.docs.map((d) => d.id as number),
  })
}
