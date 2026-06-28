import { NextResponse } from 'next/server'

import { deleteObject } from '../../../../lib/s3'
import { getPayloadClient, isOwnerOf, isStaffRequest, mutateRateOk } from '../../../../lib/ugcOwner'

// Удалить «свою» публикацию (автор по токену) ИЛИ любую (персонал). Мягкое удаление:
// status='removed' (исчезает из ленты, строка остаётся для аудита) + удаление файла из
// Object Storage (честное «удалить файл» + экономия места). Идемпотентно.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!mutateRateOk(req.headers)) {
    return NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, { status: 429 })
  }

  let id: number | null = null
  try {
    const body = (await req.json()) as { id?: unknown }
    if (typeof body.id === 'number' && Number.isInteger(body.id)) id = body.id
  } catch {
    /* ignore */
  }
  if (!id) return NextResponse.json({ error: 'Не указана публикация.' }, { status: 400 })

  const payload = await getPayloadClient()
  let sub: {
    status?: string | null
    ownerHash?: string | null
    ownerVisitor?: number | null
    objectKey?: string | null
    posterKey?: string | null
  }
  try {
    sub = await payload.findByID({ collection: 'submissions', id, depth: 0, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Публикация не найдена.' }, { status: 404 })
  }

  if (sub.status === 'removed') return NextResponse.json({ ok: true }, { status: 200 })

  const staff = await isStaffRequest(payload, req.headers)
  const isOwner = isOwnerOf(sub, req.headers)
  if (!staff && !isOwner) {
    return NextResponse.json({ error: 'Нет прав на удаление.' }, { status: 403 })
  }

  // Удаляем файл(ы) из бакета (best-effort), затем помечаем запись removed.
  if (sub.objectKey) await deleteObject(sub.objectKey)
  if (sub.posterKey) await deleteObject(sub.posterKey)

  await payload.update({
    collection: 'submissions',
    id,
    data: {
      status: 'removed',
      hiddenReason: isOwner && !staff ? 'удалено автором' : 'удалено персоналом',
    },
    overrideAccess: true,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
