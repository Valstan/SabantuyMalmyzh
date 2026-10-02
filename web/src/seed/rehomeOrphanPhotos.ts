/**
 * Перенос медиа-сирот между альбомами галереи (создать целевой, если его нет).
 *
 * Зачем: 110 фото 2026 года были сначала положены в альбом `sabantuy-2023`
 * (единственный, который был) — на витрине они стояли под чужим годом.
 * Операция: забрать из альбома-источника те фото, которые ничего, кроме этого
 * альбома, не использует, и положить их в альбом целевого года.
 *
 * Файл НЕ удаляет и НЕ трогает медиа-библиотеку: переносится только ссылка
 * альбом → фото.
 *
 * Обязательные условия, иначе скрипт отработает вхолостую (см. docs/GOTCHAS.md):
 *   - top-level await: `payload run` завершает процесс сразу после загрузки модуля;
 *   - после записи перечитываем оба альбома и сверяем с ожиданием: Payload
 *     молча выбрасывает невалидные значения и рапортует успех;
 *   - `Gallery.photos` — это `type: 'array'` с блоком `{ image, caption }`,
 *     а не hasMany-связь: писать нужно объекты, а не id.
 *
 * Переменные:
 *   SEED_MODE=plan|apply          plan по умолчанию
 *   SEED_FROM_ALBUM_ID=1          альбом-источник (id)
 *   SEED_TO_SLUG=sabantuy-2026    slug целевого альбома
 *   SEED_TO_TITLE=…               заголовок, если целевого нет (обязателен в apply)
 *   SEED_TO_DATE=2026-07-04      дата альбома
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { blockMediaId, makeBail, scanOrphanMedia } from './lib/orphanScan'

const MODE = process.env.SEED_MODE || 'plan'
const FROM_ID = Number(process.env.SEED_FROM_ALBUM_ID || '1')
const TO_SLUG = process.env.SEED_TO_SLUG || 'sabantuy-2026'
const TO_TITLE = process.env.SEED_TO_TITLE || ''
const TO_DATE = process.env.SEED_TO_DATE || '2026-07-04'

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const bail = makeBail(log)

type GalleryRow = { id: number; title?: string; photos?: unknown[]; _status?: string }

log(`[rehome] mode=${MODE} из альбома #${FROM_ID} в «${TO_SLUG}»`)

try {
  // ── 1. Кого переносим: фото-сироты, попавшие в альбом ошибочно ─────────────
  // ВАЖНО: берём ВСЕХ осирот (`orphans`), а не «пригодных к публикации»
  // (`toPublish`). После первой публикации 110 фото перестали быть сиротами —
  // на них ссылается альбом, — и поиск по toPublish находил ноль: переносить
  // было нечего. Отсекаются только копии-дубли, чтобы в новом альбоме не
  // оказалось десяти копий одного кадра.
  const scan = await scanOrphanMedia(payload, log)
  const orphans = new Set(scan.orphans.map((o) => o.id))
  const dupSet = new Set(scan.dupExtras)
  log(
    `[rehome] сирот всего: ${scan.orphans.length}, копий-дублей: ${scan.dupExtras.length} ` +
      `(из ${scan.totalMedia} файлов в медиа)`,
  )
  if (scan.totalMedia > 0 && scan.orphans.length === scan.totalMedia) {
    bail(new Error('«сироты» = все файлы → ссылки не собрались, скан сломан'))
  }

  // ── 2. Источник: какие его фото — наши осироты ───────────────────────────────
  const source = (await payload.findByID({
    collection: 'gallery',
    id: FROM_ID,
    depth: 0,
    overrideAccess: true,
  })) as unknown as GalleryRow

  const sourceBlocks = Array.isArray(source.photos) ? source.photos : []
  const takeIdx = sourceBlocks
    .map((b, i) => ({ i, id: blockMediaId(b) }))
    .filter((x) => x.id !== null && orphans.has(x.id) && !dupSet.has(x.id))
  const stayBlocks = sourceBlocks.filter((_, i) => !takeIdx.some((x) => x.i === i))
  const takeBlocks = takeIdx.map((x) => sourceBlocks[x.i])

  log(`[rehome] в источнике фото: ${sourceBlocks.length}; из них переносим: ${takeBlocks.length}; остаётся: ${stayBlocks.length}`)
  if (takeBlocks.length === 0) {
    log('[rehome] переносить нечего — источник не содержит осиротевших фото')
    process.exit(0)
  }

  // ── 3. Цель: найти или (в apply) создать ─────────────────────────────────────
  const found = await payload.find({
    collection: 'gallery',
    where: { slug: { equals: TO_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const target = found.docs[0] as GalleryRow | undefined
  const targetBlocks = target && Array.isArray(target.photos) ? target.photos : []
  const alreadyIds = new Set(
    targetBlocks
      .map(blockMediaId)
      .filter((n): n is number => n !== null && Number.isFinite(n)),
  )
  const addBlocks = takeBlocks.filter((b) => {
    const id = blockMediaId(b)
    return id !== null && !alreadyIds.has(id)
  })

  log(
    target
      ? `[rehome] цель найдена: id=${target.id}, фото в ней: ${targetBlocks.length}, добавим: ${addBlocks.length}`
      : `[rehome] цели «${TO_SLUG}» нет — создадим с ${addBlocks.length} фото`,
  )

  if (MODE !== 'apply') {
    log('[rehome] plan — ничего не менялось. Для переноса: SEED_MODE=apply')
    process.exit(0)
  }
  if (!target && !TO_TITLE) {
    bail(new Error('целевого альбома нет, а SEED_TO_TITLE пуст — не знаю, как его назвать'))
  }

  // Обложка цели — первое переносимое фото, иначе витрина галереи покажет
  // плейсхолдер.
  const coverCandidate = blockMediaId(addBlocks[0]) ?? blockMediaId(takeBlocks[0])

  // ── 4. Запись + приёмка: оба альбома перечитываем и сверяем ──────────────────
  let targetId: number
  if (target) {
    targetId = target.id
    await payload.update({
      collection: 'gallery',
      id: targetId,
      data: { photos: [...targetBlocks, ...addBlocks] } as never,
    })
  } else {
    const created = await payload.create({
      collection: 'gallery',
      data: {
        title: TO_TITLE,
        slug: TO_SLUG,
        date: TO_DATE,
        photos: addBlocks,
        ...(coverCandidate ? { coverImage: coverCandidate } : {}),
        _status: 'published',
      } as never,
      overrideAccess: true,
    })
    targetId = created.id
  }

  await payload.update({
    collection: 'gallery',
    id: FROM_ID,
    data: { photos: stayBlocks } as never,
  })

  const srcAfter = (await payload.findByID({ collection: 'gallery', id: FROM_ID, depth: 0, overrideAccess: true })) as unknown as GalleryRow
  const dstAfter = (await payload.findByID({ collection: 'gallery', id: targetId, depth: 0, overrideAccess: true })) as unknown as GalleryRow
  const srcCount = Array.isArray(srcAfter.photos) ? srcAfter.photos.length : 0
  const dstCount = Array.isArray(dstAfter.photos) ? dstAfter.photos.length : 0

  log(`[rehome] приёмка: в источнике ${srcCount} (ожидалось ${stayBlocks.length}), в цели ${dstCount} (ожидалось ${targetBlocks.length + addBlocks.length})`)
  if (srcCount !== stayBlocks.length || dstCount !== targetBlocks.length + addBlocks.length) {
    bail(new Error(`после записи: источник ${srcCount}/${stayBlocks.length}, цель ${dstCount}/${targetBlocks.length + addBlocks.length}`))
  }
  if (!target) {
    // Обложку создаваемого альбома проставляем отдератьным обновлением.
    await payload.update({
      collection: 'gallery',
      id: targetId,
      data: { ...(coverCandidate ? { coverImage: coverCandidate } : {}) } as never,
    })
    log(`[rehome] обложка цели: media #${coverCandidate}`)
  }
  log(`[rehome] готово: перенесено ${addBlocks.length} фото в альбом «${TO_SLUG}» (#${targetId})`)
} catch (err) {
  bail(err)
}

await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
process.exit(0)