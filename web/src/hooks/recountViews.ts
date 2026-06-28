import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { relId } from '../lib/ugc'

// Пересчёт viewCount у публикации COUNT'ом по таблице просмотров (источник правды), а
// не ±1: идемпотентно и без гонок инкремента. req передаём во все вызовы — иначе
// count/update идут вне текущей транзакции и не видят только что вставленную строку
// (off-by-one, как ловили в PR3 на лайках/комментах).
async function recount(req: PayloadRequest, submissionId: number) {
  try {
    const { totalDocs } = await req.payload.count({
      collection: 'submission-views',
      where: { submission: { equals: submissionId } },
      overrideAccess: true,
      req,
    })
    await req.payload.update({
      collection: 'submissions',
      id: submissionId,
      data: { viewCount: totalDocs },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    // Сбой пересчёта не должен ронять основную операцию (просмотр уже создан/удалён).
    req.payload.logger.error({ err, submissionId }, 'recountViews failed')
  }
}

export const recountViewsAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}

export const recountViewsAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}
