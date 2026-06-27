import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { relId } from '../lib/ugc'

// Пересчёт likeCount у публикации по факту изменения/удаления реакции. Считаем COUNT
// реакций для submission (источник правды — таблица реакций), а не ±1: идемпотентно и
// без гонок инкремента. req передаём во все вызовы — иначе count/update идут вне
// текущей транзакции и не видят только что вставленную/удалённую строку (off-by-one).
async function recount(req: PayloadRequest, submissionId: number) {
  try {
    const { totalDocs } = await req.payload.count({
      collection: 'submission-reactions',
      where: { submission: { equals: submissionId } },
      overrideAccess: true,
      req,
    })
    await req.payload.update({
      collection: 'submissions',
      id: submissionId,
      data: { likeCount: totalDocs },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    // Сбой пересчёта не должен ронять основную операцию (лайк уже создан/удалён).
    req.payload.logger.error({ err, submissionId }, 'recountReactionLikes failed')
  }
}

export const recountReactionLikesAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}

export const recountReactionLikesAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}
