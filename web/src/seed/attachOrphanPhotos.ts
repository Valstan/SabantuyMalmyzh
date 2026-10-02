/**
 * Перенос осиротевших медиа в альбом галереи (attach, НЕ удаление).
 *
 * Зачем: файлы лежат в медиа-библиотеке без ссылок — их скачал конвейер
 * `collect-vk` из постов подписчиков ВК 05.07, но в галерею они не попали.
 *
 * Что делает:
 *   1. Находит медиа без ссылок (скан вынесен в ./lib/orphanScan — те же правила,
 *      что и в эталоне .github/scripts/media-orphans-reference.sql).
 *   2. Находит группы одинаковых по размеру файлов = вероятные дубли.
 *   3. Кладёт в альбом по одной копии из каждой группы (лишние копии НЕ удаляет,
 *      просто не публикует).
 *
 * Обязательные условия, иначе скрипт отработает вхолостую (см. docs/GOTCHAS.md):
 *   - top-level await: `payload run` завершает процесс сразу после загрузки
 *     модуля — обёртка main().then() умирает молча, с кодом 0 и без вывода;
 *   - `Gallery.photos` — `type: 'array'` с блоком `{ image, caption }`, а НЕ
 *     hasMany-связь: список id Payload выбрасывает без ошибки, и скрипт рапортует
 *     «готово» при неизменённом альбоме;
 *   - после записи альбом перечитывается: «готово» без сверки недоказуемо.
 *
 * Режимы: SEED_MODE=plan (только отчёт) | apply (реально прикрепить).
 * Файлы лишних копий НЕ трогает — это отдельное решение владельца.
 */

import { getPayload } from 'payload'
import config from '@payload-config'
import { blockMediaId, makeBail, scanOrphanMedia } from './lib/orphanScan'

const MODE = process.env.SEED_MODE || 'plan'
const ALBUM_SLUG = process.env.SEED_ALBUM || 'sabantuy-2023'
const ALBUM_ID = Number(process.env.SEED_ALBUM_ID || '1')

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const bail = makeBail(log)

log(`[attach-orphans] mode=${MODE} album=${ALBUM_SLUG} (id=${ALBUM_ID})`)

try {
  // ── 1-2. Осироты и копии-дубли ───────────────────────────────────────────────
  const scan = await scanOrphanMedia(payload, log)
  log(`[attach-orphans] сирот найдено: ${scan.orphans.length}`)
  log(`[attach-orphans] всего файлов в медиа: ${scan.totalMedia} (из них без ссылок ${scan.orphans.length})`)
  if (scan.totalMedia > 0 && scan.orphans.length === scan.totalMedia) {
    log('[attach-orphans] СТОП: «сироты» = все файлы → ссылки не собрались, скан сломан')
    process.exit(1)
  }
  log(`[attach-orphans] дублей (одинаковый размер): ${scan.dupExtras.length} — не публикуем`)
  log(`[attach-orphans] к публикации: ${scan.toPublish.length}`)

  // ── 3. Альбом и текущее содержимое ───────────────────────────────────────────
  const album = (await payload.findByID({ collection: 'gallery', id: ALBUM_ID, depth: 0, overrideAccess: true })) as unknown as {
    photos?: unknown[]
  }
  const existing = Array.isArray(album.photos) ? album.photos : []
  const currentIds = new Set<number>(
    existing.map(blockMediaId).filter((n): n is number => n !== null && Number.isFinite(n)),
  )
  const fresh = scan.toPublish.filter((o) => !currentIds.has(o.id))
  log(`[attach-orphans] в альбоме «${ALBUM_SLUG}» сейчас: ${existing.length}; добавим: ${fresh.length}`)

  if (MODE !== 'apply') {
    log('[attach-orphans] plan — ничего не менялось. Для реального переноса: SEED_MODE=apply')
    process.exit(0)
  }

  if (fresh.length === 0) {
    log('[attach-orphans] нечего добавлять — все уже в альбоме')
    process.exit(0)
  }

  await payload.update({
    collection: 'gallery',
    id: ALBUM_ID,
    data: {
      photos: [...existing, ...fresh.map((o) => ({ image: o.id, caption: '' }))],
    } as never,
  })

  // Приёмка: перечитываем альбом и убеждаемся, что он вырос.
  const after = (await payload.findByID({ collection: 'gallery', id: ALBUM_ID, depth: 0, overrideAccess: true })) as unknown as {
    photos?: unknown[]
  }
  const afterCount = Array.isArray(after.photos) ? after.photos.length : 0
  log(`[attach-orphans] приёмка: фото в альбоме после записи: ${afterCount}`)
  if (afterCount < existing.length + fresh.length) {
    bail(new Error(`альбом вырос на ${afterCount - existing.length} вместо ${fresh.length}`))
  }
  log(`[attach-orphans] готово: добавлено ${fresh.length} фото в «${ALBUM_SLUG}»`)
} catch (err) {
  bail(err)
}

// Пустая запись в stdout: её колбэк срабатывает, когда предыдущие асинхронные
// записи в пайп уже ушли. Иначе process.exit() обрезает отчёт.
await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
process.exit(0)