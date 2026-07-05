/**
 * Модерация кандидатов «Фотостены» пачкой (I8): approve/reject по списку id
 * через Local API — чтобы на approve сработал хук approveVkCandidate
 * (скачивание кадра в Media). psql UPDATE так не может — хук не дёрнется.
 *
 *   VK_MODERATE_ACTION=approve VK_MODERATE_IDS=1,2,3 \
 *     node <jiti-cli> web/src/seed/moderateVkCandidates.ts
 *
 * Env: VK_MODERATE_ACTION = approve | reject; VK_MODERATE_IDS = id через запятую.
 * Запуск — workflow moderate-vk.yml (паттерн collect-vk, jiti — не payload run).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита */
import { getPayload } from 'payload'

import config from '../payload.config'

const ACTION = process.env.VK_MODERATE_ACTION
const IDS = (process.env.VK_MODERATE_IDS || '')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n > 0)

async function run() {
  if (ACTION !== 'approve' && ACTION !== 'reject') {
    console.error(`VK_MODERATE_ACTION должен быть approve|reject, получено: ${ACTION}`)
    process.exit(1)
  }
  if (!IDS.length) {
    console.error('VK_MODERATE_IDS пуст — нечего модерировать.')
    process.exit(1)
  }
  const payload = await getPayload({ config })
  const status = ACTION === 'approve' ? 'approved' : 'rejected'
  let ok = 0
  let fail = 0
  for (const id of IDS) {
    try {
      const doc: any = await payload.update({
        collection: 'vk-candidates',
        id,
        data: { status },
        overrideAccess: true,
      })
      const note =
        status === 'approved'
          ? doc.media
            ? `media=${typeof doc.media === 'object' ? doc.media.id : doc.media}`
            : `БЕЗ media (${doc.downloadError || 'ошибка скачивания?'})`
          : 'rejected'
      console.log(`✓ id=${id} → ${status} (${note})`)
      ok += 1
    } catch (e) {
      console.error(`✗ id=${id}: ${e instanceof Error ? e.message : e}`)
      fail += 1
    }
  }
  console.log(`Итог: ${ok} ок, ${fail} ошибок из ${IDS.length}.`)
  process.exit(fail > 0 ? 1 : 0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
