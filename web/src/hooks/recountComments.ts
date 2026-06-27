import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { relId } from '../lib/ugc'

// Пересчёт commentCount у публикации: COUNT видимых (status='visible') комментариев для
// submission. Срабатывает на создании/правке статуса/удалении коммента → счётчик в
// ленте отражает только видимые. req — чтобы count/update шли в той же транзакции.
async function recount(req: PayloadRequest, submissionId: number) {
  try {
    const { totalDocs } = await req.payload.count({
      collection: 'submission-comments',
      where: {
        and: [{ submission: { equals: submissionId } }, { status: { equals: 'visible' } }],
      },
      overrideAccess: true,
      req,
    })
    await req.payload.update({
      collection: 'submissions',
      id: submissionId,
      data: { commentCount: totalDocs },
      overrideAccess: true,
      req,
    })
  } catch (err) {
    req.payload.logger.error({ err, submissionId }, 'recountComments failed')
  }
}

export const recountCommentsAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}

export const recountCommentsAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relId(doc?.submission)
  if (id) await recount(req, id)
  return doc
}
