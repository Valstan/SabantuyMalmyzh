/**
 * Общий скан ссылок на Media для сидов (вынесен из `attachOrphanPhotos.ts`,
 * потому что понадобился второму сиду — `rehomeOrphanPhotos.ts`).
 *
 * Правила ровно те, что в эталоне `.github/scripts/media-orphans-reference.sql`:
 * (1) relation-колонки `*_id`; (2) ЛЮБАЯ целочисленная колонка (join-таблицы
 * many-to-many); (3) jsonb lexical-embed'ы. Внутренние таблицы Payload
 * исключены — иначе ложный «ноль ссылок».
 *
 * Расхождение с эталоном — не «шум», а подсказка: 315 против 157 указали
 * на отсутствие блока (2).
 *
 * Скан строится ОДНИМ запросом: `payload.db.drizzle.execute()` берёт своё
 * соединение из пула, `CREATE TEMP TABLE` в нём не переживает следующий вызов,
 * а `DO $$ … EXCEPTION WHEN others` глушит это без слов.
 */

import { writeSync } from 'node:fs'
import type { Payload } from 'payload'

export type OrphanMedia = { id: number; filename: string; filesize: number | null }

export type OrphanScan = {
  orphans: OrphanMedia[]
  /** Лишние копии внутри групп одинакового размера — их не публикуем. */
  dupExtras: number[]
  /** Осироты за вычетом дублей: то, что имеет смысл показывать. */
  toPublish: OrphanMedia[]
  totalMedia: number
  columns: { rel: number; allInt: number; jsonb: number }
}

type Row = Record<string, unknown>

const q = (s: string) => `"${s.replace(/"/g, '""')}"`

export async function scanOrphanMedia(payload: Payload, log: (...a: unknown[]) => void): Promise<OrphanScan> {
  const rowsOf = async (q2: string): Promise<Row[]> => {
    const res = (await payload.db.drizzle.execute(q2)) as { rows?: Row[] }
    return res.rows || []
  }

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

  const columns = { rel: relCols.length, allInt: allCols.length, jsonb: jsonCols.length }
  log(`[orphan-scan] колонок-ссылок: *_id ${columns.rel}, все int ${columns.allInt}, jsonb ${columns.jsonb}`)
  if (columns.rel + columns.allInt + columns.jsonb === 0) {
    throw new Error('ни одной колонки-ссылки не найдено — скан сломан')
  }

  const parts: string[] = []
  for (const r of [...relCols, ...allCols]) {
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

  const scanRows = await rowsOf(`
    WITH ref AS (
      ${parts.map((p, i) => (i ? `  UNION ALL\n${p}` : `  ${p}`)).join('\n')}
    )
    SELECT json_agg(t ORDER BY t.id) AS payload FROM (
      SELECT m.id, m.filename, m.filesize
      FROM media m
      LEFT JOIN ref r ON r.media_id = m.id
      WHERE r.media_id IS NULL
    ) t`)

  const orphans = (scanRows[0]?.payload || []) as OrphanMedia[]
  const totalMedia = Number((await rowsOf(`SELECT count(*)::int AS n FROM media`))[0]?.n || 0)

  // Группы одинакового размера = вероятные дубли (один кадр, скачанный много раз).
  const bySize = new Map<number, OrphanMedia[]>()
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

  return {
    orphans,
    dupExtras,
    toPublish: orphans.filter((o) => !dupExtras.includes(o.id)),
    totalMedia,
    columns,
  }
}

/** Номер media из блока галереи (`{ image, caption }`) или из «голого» числа. */
export function blockMediaId(block: unknown): number | null {
  if (typeof block === 'number') return block
  if (block && typeof block === 'object') {
    const img = (block as { image?: unknown }).image
    if (typeof img === 'number') return img
    if (img && typeof img === 'object') {
      const id = (img as { id?: unknown }).id
      if (id !== undefined && id !== null) return Number(id)
    }
  }
  return null
}

/** Печать причины ошибки туда, где её видно: stderr + логгер сида. */
export function makeBail(log: (...a: unknown[]) => void): (err: unknown) => never {
  const describe = (err: unknown): string => {
    const e = err as { name?: string; message?: string; stack?: string; cause?: unknown }
    const cause = e?.cause ? ` | причина: ${String((e.cause as Error)?.message || e.cause)}` : ''
    return `${e?.name || 'Error'}: ${e?.message || String(err)}${cause}\n${(e?.stack || '').slice(0, 900)}`
  }
  return (err: unknown): never => {
    log(`ФАТАЛЬНО — ${describe(err)}`)
    writeSync(2, `ФАТАЛЬНО: ${describe(err)}\n`)
    process.exit(1)
  }
}