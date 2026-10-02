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
 *   SEED_MATCH_PREFIX=fotostena  префикс имён файлов, которые считаем заезжими
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { blockMediaId, fetchMediaFilenames, makeBail, scanOrphanMedia } from './lib/orphanScan'

const MODE = process.env.SEED_MODE || 'plan'
const FROM_ID = Number(process.env.SEED_FROM_ALBUM_ID || '1')
const TO_SLUG = process.env.SEED_TO_SLUG || 'sabantuy-2026'
const TO_TITLE = process.env.SEED_TO_TITLE || ''
const TO_DATE = process.env.SEED_TO_DATE || '2026-07-04'
// Префикс имён файлов, которые ставит конвейер ВК (`fotostena--<vkId>_…`):
// по нему и отличаем фото этого года от «родных» фото альбома.
const MATCH_PREFIX = process.env.SEED_MATCH_PREFIX || 'fotostena'

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const bail = makeBail(log)

type GalleryRow = { id: number; title?: string; photos?: unknown[]; _status?: string }

log(`[rehome] mode=${MODE} из альбома #${FROM_ID} в «${TO_SLUG}» (дата ${TO_DATE})`)

// Дата приходит из воркфлоу и однажды пришла обрезанной до «2026»: ssh склеивает
// аргументы без кавычек, пробел в заголовке альбома съел часть следующего
// параметра. Payload такие даты не отвергает, Postgres падает внутри вставки.
// Поэтому формат проверяем сами, до записи.
if (MODE === 'apply' && !/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(TO_DATE)) {
  bail(new Error(`дата альбона не в формате ГГГГ-ММ-ДД: «${TO_DATE}»`))
}

try {
  // ── 1. Откуда эти фото вообще взялись ───────────────────────────────────────
  // Отбор по «фото-сироте» здесь невозможен по определению: на фото в альбоме
  // ссылается альбом, то есть оно перестаёт быть сиротой сразу после публикации.
  // Первый план это и показал: «переносить нечего», хотя переносить было 110.
  // Поэтому отбор идёт по происхождению: файлы, названные конвейером ВК
  // (`fotostena--<vkId>_<postId>_<idx>.jpg`), в альбоме чужого года — заезжие.
  const scan = await scanOrphanMedia(payload, log)
  log(
    `[rehome] сирот всего: ${scan.orphans.length}, копий-дублей: ${scan.dupExtras.length} ` +
      `(из ${scan.totalMedia} файлов в медиа)`,
  )
  if (scan.totalMedia > 0 && scan.orphans.length === scan.totalMedia) {
    bail(new Error('«сироты» = все файлы → ссылки не собрались, скан сломан'))
  }

  // ── 2. Источник: какие его фото — заезжие ────────────────────────────────────
  const source = (await payload.findByID({
    collection: 'gallery',
    id: FROM_ID,
    depth: 0,
    overrideAccess: true,
  })) as unknown as GalleryRow

  const sourceBlocks = Array.isArray(source.photos) ? source.photos : []
  const sourceIds = sourceBlocks
    .map(blockMediaId)
    .filter((n): n is number => n !== null && Number.isFinite(n))
  const names = await fetchMediaFilenames(payload, sourceIds)

  const foreignIdx = sourceBlocks
    .map((_, i) => i)
    .filter((i) => {
      const id = blockMediaId(sourceBlocks[i])
      return id !== null && names.get(id)?.startsWith(MATCH_PREFIX)
    })

  // Копии-дубли (одинаковый размер) в новый альбом не тащим: 16 одинаковых
  // кадров в витрине выглядят как поломка.
  const dupSet = new Set(scan.dupExtras)
  const sizeOf = new Map(scan.orphans.map((o) => [o.id, o.filesize]))
  const seenSize = new Set<number>()
  const takeIdx = foreignIdx.filter((i) => {
    const id = blockMediaId(sourceBlocks[i])
    if (id === null || dupSet.has(id)) return false
    const size = sizeOf.get(id)
    if (size !== undefined && size !== null) {
      if (seenSize.has(size)) return false
      seenSize.add(size)
    }
    return true
  })

  const stayBlocks = sourceBlocks.filter((_, i) => !takeIdx.includes(i))
  const takeBlocks = takeIdx.map((i) => sourceBlocks[i])

  const sample = takeIdx
    .slice(0, 3)
    .map((i) => names.get(blockMediaId(sourceBlocks[i]) ?? -1))
    .filter(Boolean)
  log(
    `[rehome] в источнике фото: ${sourceBlocks.length}; заезжих (${MATCH_PREFIX}*): ${foreignIdx.length}; ` +
      `переносим: ${takeBlocks.length}; остаётся: ${stayBlocks.length}`,
  )
  if (sample.length) log(`[rehome] пример: ${sample.join(', ')}`)
  if (takeBlocks.length === 0) {
    log(`[rehome] переносить нечего: в источнике нет файлов ${MATCH_PREFIX}*`)
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

  // Блок переносим ЗАНОВО, а не копируем как есть: у блока, прочитанного из
  // альбома, есть собственный `id` — идентификатор строки в gallery_photos.
  // Копирование таких блоков в новый альбом упирается в первичный ключ
  // («The following field is invalid: id»). Нас интересуют картинка и подпись.
  const addBlocks = takeBlocks
    .map((b) => {
      const image = blockMediaId(b)
      const caption = b && typeof b === 'object' ? String((b as { caption?: unknown }).caption ?? '') : ''
      return image === null ? null : { image, caption }
    })
    .filter((b): b is { image: number; caption: string } => b !== null)
    .filter((b) => !alreadyIds.has(b.image))

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
  const coverCandidate = addBlocks[0]?.image ?? null

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
  if (!target) log(`[rehome] обложка цели: media #${coverCandidate ?? '—'}`)
  log(`[rehome] готово: перенесено ${addBlocks.length} фото в альбом «${TO_SLUG}» (#${targetId})`)
} catch (err) {
  bail(err)
}

await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
process.exit(0)