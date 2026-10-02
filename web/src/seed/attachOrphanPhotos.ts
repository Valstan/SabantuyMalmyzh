/**
 * Перенос осиротевших медиа в альбом галереи (attach, НЕ удаление).
 *
 * Зачем: файлы лежат в медиа-библиотеке без ссылок — их скачал конвейер
 * `collect-vk` из постов подписчиков ВК 05.07, но в галерею они не попали.
 *
 * Что делает:
 *   1. Находит медиа без ссылок (те же правила, что и в probe: relation-колонки
 *      + jsonb lexical, минус внутренние таблицы Payload — иначе ложный ноль).
 *   2. Находит группы одинаковых по размеру файлов = вероятные дубли.
 *   3. Кладёт в альбом по одной копии из каждой группы (лишние копии НЕ удаляет,
 *      просто не публикует).
 *
 * Два требования к среде, оба найдены не сразу (см. docs/GOTCHAS.md):
 *   - top-level await: `payload run` завершает процесс сразу после загрузки
 *     модуля — обёртка main().then() умирает молча, с кодом 0 и без вывода;
 *   - скан ссылок строится ОДНИМ запросом: `CREATE TEMP TABLE` живёт в
 *     соединении, а drizzle берёт из пула разные — следующий запрос видит пустую
 *     (точнее, отсутствующую) временную таблицу, а ошибки внутри DO-блоков были
 *     заглушены `EXCEPTION WHEN others` → «сирот: 640», то есть все файлы.
 *
 * Режимы: SEED_MODE=plan (только отчёт) | apply (реально прикрепить).
 * Файлы лишних копий НЕ трогает — это отдельное решение владельца.
 */

import { writeSync } from 'node:fs'
import { getPayload } from 'payload'
import config from '@payload-config'

const MODE = process.env.SEED_MODE || 'plan'
const ALBUM_SLUG = process.env.SEED_ALBUM || 'sabantuy-2023'
const ALBUM_ID = Number(process.env.SEED_ALBUM_ID || '1')

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))

// Причина ошибки обязана быть В ЛОГЕ. `payload run` глушит необработанное
// отклонение верхнего уровня (тихо, код 1), а stderr дочернего pnpm-процесса в
// логе воркфлоу не виден — поэтому пишем и в логгер, и в stderr.
const describe = (err: unknown): string => {
  const e = err as { name?: string; message?: string; stack?: string; cause?: unknown }
  const cause = e?.cause ? ` | причина: ${String((e.cause as Error)?.message || e.cause)}` : ''
  return `${e?.name || 'Error'}: ${e?.message || String(err)}${cause}\n${(e?.stack || '').slice(0, 900)}`
}

const bail = (err: unknown): never => {
  log(`[attach-orphans] ФАТАЛЬНО — ${describe(err)}`)
  writeSync(2, `[attach-orphans] ФАТАЛЬНО: ${describe(err)}\n`)
  process.exit(1)
}

try {
  type Row = Record<string, unknown>
  const rowsOf = async (q: string): Promise<Row[]> => {
    try {
      const res = (await payload.db.drizzle.execute(q)) as { rows?: Row[] }
      return res.rows || []
    } catch (err) {
      return bail(err)
    }
  }

  // ── 1. Какие колонки вообще могут ссылаться на media ──────────────────────────
  // Внутренние таблицы Payload исключены: `_media_v.parent_id` и
  // `media_locales._parent_id` равны id своей же media, и без исключения скан
  // показывает ложный ноль.
  const EXCLUDED_TABLE = `t.table_name <> 'media'
      AND t.table_name NOT LIKE '\\_%'
      AND t.table_name NOT LIKE '%\\_locales'
      AND t.table_name NOT LIKE '%\\_rels'
      AND t.table_name NOT LIKE 'payload\\_%'`

  const relCols = await rowsOf(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('integer', 'bigint')
      AND c.column_name LIKE '%\\_id'
      AND c.column_name <> '_parent_id'
      AND ${EXCLUDED_TABLE}
    ORDER BY c.table_name, c.column_name`)

  // (2) Join-таблицы many-to-many: ЛЮБАЯ целочисленная колонка, значение которой
  //     совпадает с media.id. Без этого блока скан даёт 315 «сирот» вместо 157:
  //     часть файлов помечена как связанная по *_id-колонкам, а Payload держит
  //     hasMany-связи иначе. Правило пробы (.github/scripts/media-orphans-reference.sql)
  //     ровно такое — здесь обязаны совпадать, иначе цифры расходятся.
  const allCols = await rowsOf(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('integer', 'bigint')
      AND c.column_name <> '_parent_id'
      AND ${EXCLUDED_TABLE}
    ORDER BY c.table_name, c.column_name`)

  const jsonCols = await rowsOf(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'jsonb'
      AND ${EXCLUDED_TABLE}
    ORDER BY c.table_name, c.column_name`)

  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const parts: string[] = []

  for (const r of relCols) {
    const t = q(String(r.table_name))
    const c = q(String(r.column_name))
    parts.push(
      `SELECT DISTINCT t1.${c}::bigint AS media_id FROM public.${t} t1
       WHERE t1.${c} IS NOT NULL
         AND EXISTS (SELECT 1 FROM media m WHERE m.id = t1.${c})`,
    )
  }

  for (const r of allCols) {
  const t = q(String(r.table_name))
  const c = q(String(r.column_name))
  parts.push(
    `SELECT DISTINCT t1.${c}::bigint AS media_id FROM public.${t} t1
     WHERE t1.${c} IS NOT NULL
       AND EXISTS (SELECT 1 FROM media m WHERE m.id = t1.${c})`,
  )
}

for (const r of jsonCols) {
    const t = q(String(r.table_name))
    const c = q(String(r.column_name))
    parts.push(
      `SELECT DISTINCT q1.v::bigint AS media_id
       FROM public.${t} t1,
         LATERAL jsonb_path_query(t1.${c}, '$[*]?(@.relationTo == "media").value') AS q1(v)
       WHERE jsonb_typeof(q1.v) = 'number'
         AND q1.v::text ~ '^[0-9]+$'
         AND EXISTS (SELECT 1 FROM media m WHERE m.id = q1.v::bigint)`,
    )
  }

  log(`[attach-orphans] колонок-ссылок: *_id ${relCols.length}, все int ${allCols.length}, jsonb ${jsonCols.length}`)
  if (parts.length === 0) {
    log('[attach-orphans] НИ ОДНОЙ колонки-ссылки не найдено — скан не запускаю (иначе «сироты» = всё)')
    process.exit(1)
  }

  // ── 2. Один запрос: объединение всех ссылок + список файлов без ссылок ────────
  const scanSql = `
  WITH ref AS (
  ${parts.map((p, i) => (i ? `  UNION ALL\n${p}` : `  ${p}`)).join('\n')}
  )
  SELECT json_agg(t ORDER BY t.id) AS payload FROM (
    SELECT m.id, m.filename, m.filesize
    FROM media m
    LEFT JOIN ref r ON r.media_id = m.id
    WHERE r.media_id IS NULL
  ) t`

  const scanRows = await rowsOf(scanSql)
  const orphans = (scanRows[0]?.payload || []) as { id: number; filename: string; filesize: number | null }[]
  log(`[attach-orphans] сирот найдено: ${orphans.length}`)

  // Контроль: 640 = «все файлы» означает, что отсылки не собрались (см. шапку).
  const totalMedia = Number((await rowsOf(`SELECT count(*)::int AS n FROM media`))[0]?.n || 0)
  log(`[attach-orphans] всего файлов в медиа: ${totalMedia} (из них без ссылок ${orphans.length})`)
  if (totalMedia > 0 && orphans.length === totalMedia) {
    log('[attach-orphans] СТОП: «сироты» = все файлы → ссылки не собрались, скан сломан')
    process.exit(1)
  }

  // ── 3. Группы одинакового размера = вероятные дубли. Публикуем одну копию ────
  const bySize = new Map<number, typeof orphans>()
  for (const o of orphans) {
    if (!o.filesize) continue
    const list = bySize.get(o.filesize) || []
    list.push(o)
    bySize.set(o.filesize, list)
  }
  const dupExtras: number[] = []
  for (const list of bySize.values()) {
    if (list.length > 1) {
      list.sort((a, b) => a.id - b.id)
      for (const extra of list.slice(1)) dupExtras.push(extra.id)
    }
  }
  const toAttach = orphans.filter((o) => !dupExtras.includes(o.id))
  log(`[attach-orphans] дублей (одинаковый размер): ${dupExtras.length} — не публикуем`)
  log(`[attach-orphans] к публикации: ${toAttach.length}`)

  // ── 4. Альбом и текущее содержимое ───────────────────────────────────────────
  const album = (await payload.findByID({ collection: 'gallery', id: ALBUM_ID, depth: 0, overrideAccess: true })) as unknown as {
    photos?: (number | { id: number })[]
  }
  const existing = Array.isArray(album.photos) ? album.photos : []
  const currentIds = new Set<number>(existing.map((m) => (typeof m === 'object' && m ? m.id : Number(m))))
  const fresh = toAttach.filter((o) => !currentIds.has(o.id))
  log(`[attach-orphans] в альбоме «${ALBUM_SLUG}» сейчас: ${existing.length}; добавим: ${fresh.length}`)

  if (MODE !== 'apply') {
    log('[attach-orphans] plan — ничего не менялось. Для реального переноса: SEED_MODE=apply')
    process.exit(0)
  }

  if (fresh.length === 0) {
    log('[attach-orphans] нечего добавлять — все уже в альбоме')
    process.exit(0)
  }

  try {
    await payload.update({
      collection: 'gallery',
      id: ALBUM_ID,
      data: { photos: [...existing, ...fresh.map((o) => o.id)] } as never,
    })
  } catch (err) {
    bail(err)
  }
  log(`[attach-orphans] готово: добавлено ${fresh.length} фото в «${ALBUM_SLUG}»`)

  // Пустая запись в stdout: её колбэк срабатывает, когда предыдущие асинхронные
  // записи в пайп уже ушли. Иначе process.exit() обрезает отчёт.
  await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
  process.exit(0)
} catch (err) {
  bail(err)
}
