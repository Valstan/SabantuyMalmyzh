/**
 * Перенос осиротевших медиа в альбом галереи (attach, НЕ удаление).
 *
 * Зачем: 157 файлов лежат в медиа-библиотеке без ссылок — их скачал конвейер
 * `collect-vk` из постов подписчиков ВК 05.07, но в галерею они не попали.
 *
 * Что делает:
 *   1. Находит медиа без ссылок (те же правила, что и в probe: relation-колонки
 *      + jsonb lexical, минус внутренние таблицы Payload — иначе ложный ноль).
 *   2. Находит группы одинаковых по размеру файлов = вероятные дубли.
 *   3. Кладёт в альбом по одной копии из каждой группы (лишние копии НЕ удаляет,
 *      просто не публикует).
 *
 * Обязательно top-level await: `payload run` завершает процесс сразу после загрузки
 * модуля — обёртка main().then() умирает молча, с кодом 0 и без вывода.
 *
 * Режимы: SEED_MODE=plan (только отчёт) | apply (реально прикрепить).
 * Файл удалённых/лишних НЕ трогает — это отдельное решение владельца.
 */

import { getPayload } from 'payload'
import config from '@payload-config'

const MODE = process.env.SEED_MODE || 'plan'
const ALBUM_SLUG = process.env.SEED_ALBUM || 'sabantuy-2023'
const ALBUM_ID = Number(process.env.SEED_ALBUM_ID || '1')

const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
log(`[attach-orphans] mode=${MODE} album=${ALBUM_SLUG} (id=${ALBUM_ID})`)

// 1. Сироты: те же исключения внутренних таблиц, что в probe-media-orphans.
const sql = `
  CREATE TEMP TABLE ref_media (media_id bigint PRIMARY KEY);
  DO $$
  DECLARE r record;
  BEGIN
    FOR r IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND c.data_type IN ('integer', 'bigint')
        AND c.column_name LIKE '%\_id'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name <> 'media'
        AND c.table_name NOT LIKE '\_%'
        AND c.table_name NOT LIKE '%\_locales'
        AND c.table_name NOT LIKE '%\_rels'
        AND c.table_name NOT LIKE 'payload\_%'
        AND c.column_name <> '_parent_id'
    LOOP
      BEGIN
        EXECUTE format(
          'INSERT INTO ref_media (media_id)
           SELECT DISTINCT ("%1$I"."%2$I")::bigint
           FROM public."%1$I" "%1$I"
           WHERE "%1$I"."%2$I" IS NOT NULL
             AND EXISTS (SELECT 1 FROM media m WHERE m.id = "%1$I"."%2$I")
           ON CONFLICT (media_id) DO NOTHING',
          r.table_name, r.column_name
        );
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END $$;
  DO $$
  DECLARE r record;
  BEGIN
    FOR r IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND c.data_type = 'jsonb'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name NOT LIKE '\_%'
        AND c.table_name NOT LIKE '%\_locales'
        AND c.table_name NOT LIKE '%\_rels'
        AND c.table_name NOT LIKE 'payload\_%'
    LOOP
      BEGIN
        EXECUTE format(
          'INSERT INTO ref_media (media_id)
           SELECT DISTINCT v::bigint
           FROM public."%1$I" "%1$I",
                LATERAL jsonb_path_query("%1$I"."%2$I", ''$[*]?(@.relationTo == "media").value'') AS q(v)
           WHERE q.v IS NOT NULL
             AND jsonb_typeof(q.v) = ''number''
             AND q.v::text ~ ''^[0-9]+$''
           ON CONFLICT (media_id) DO NOTHING',
          r.table_name, r.column_name
        );
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END $$;
  SELECT json_agg(t) FROM (
    SELECT m.id, m.filename, m.filesize
    FROM media m LEFT JOIN ref_media r ON r.media_id = m.id
    WHERE r.media_id IS NULL
    ORDER BY m.filesize DESC NULLS LAST
  ) t;
`
const res = (await payload.db.drizzle.execute(sql)) as { rows: { json_agg: unknown }[] }
const orphans = (res.rows[0]?.json_agg || []) as { id: number; filename: string; filesize: number | null }[]
log(`[attach-orphans] сирот найдено: ${orphans.length}`)

// 2. Группы одинакового размера = вероятные дубли. Публикуем одну копию.
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

// 3. Альбом и текущее содержимое.
const album = (await payload.findByID({ collection: 'gallery', id: ALBUM_ID, depth: 0, overrideAccess: true })) as unknown as {
  photos?: (number | { id: number })[]
}
const existing = Array.isArray(album.photos) ? album.photos : []
const current = existing.length
const currentIds = new Set<number>(
  existing.map((m) => (typeof m === 'object' && m ? m.id : Number(m))),
)
const fresh = toAttach.filter((o) => !currentIds.has(o.id))
log(`[attach-orphans] в альбоме сейчас: ${current}; добавим: ${fresh.length}`)

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
  data: { photos: [...existing, ...fresh.map((o) => o.id)] } as never,
})
log(`[attach-orphans] готово: добавлено ${fresh.length} фото в «${ALBUM_SLUG}»`)

// Пустая запись в stdout: её колбэк срабатывает, когда предыдущие асинхронные
// записи в пайп уже ушли. Иначе process.exit() обрезает отчёт.
await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
process.exit(0)
