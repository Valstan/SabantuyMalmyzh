import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { relId } from '../lib/ugc'

// Пересчёт счёта «Фотобитвы» у публикации COUNT'ом по таблице раундов (источник правды),
// без ±1: идемпотентно и без гонок. battleWins = число побед, battleShows = число
// появлений (побед + поражений). req во всех вызовах — иначе count/update идут вне
// текущей транзакции и не видят только что вставленную строку (off-by-one). Счёт игры
// ОТДЕЛЬНЫЙ от лайков ленты (likeCount) — это разные сигналы.
async function recountFor(req: PayloadRequest, id: number) {
  const wins = await req.payload.count({
    collection: 'photo-battles',
    where: { winner: { equals: id } },
    overrideAccess: true,
    req,
  })
  const losses = await req.payload.count({
    collection: 'photo-battles',
    where: { loser: { equals: id } },
    overrideAccess: true,
    req,
  })
  await req.payload.update({
    collection: 'submissions',
    id,
    data: { battleWins: wins.totalDocs, battleShows: wins.totalDocs + losses.totalDocs },
    overrideAccess: true,
    req,
  })
}

async function recountBoth(req: PayloadRequest, winnerId?: number, loserId?: number) {
  try {
    if (winnerId) await recountFor(req, winnerId)
    if (loserId) await recountFor(req, loserId)
  } catch (err) {
    // Сбой пересчёта не должен ронять основную операцию (раунд уже создан/удалён).
    req.payload.logger.error({ err, winnerId, loserId }, 'recountBattle failed')
  }
}

export const recountBattleAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  await recountBoth(req, relId(doc?.winner), relId(doc?.loser))
  return doc
}

export const recountBattleAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await recountBoth(req, relId(doc?.winner), relId(doc?.loser))
  return doc
}
