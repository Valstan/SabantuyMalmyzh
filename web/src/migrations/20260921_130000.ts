import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Payload 3.90 / @payloadcms/storage-s3 3.90: плагин cloud-storage добавляет
 * upload-коллекциям скрытое поле `_objectKey` (text) — уникальный ключ объекта
 * в хранилище. Без колонки любой select по `media` падает
 * («column media._objectkey does not exist»), /fotostena рендерится пустой,
 * /api/media — 500. Поймано на проде после #322 (probe-app run 35644727963).
 *
 * Почему детектор generate:types это пропустил: плагин включён только при
 * заданных S3-ключах (payload.config.ts, enabled: Boolean(...)), а локально
 * их нет → поле в конфиг не попадает. Детектор надо гонять с фиктивными
 * S3-переменными: `S3_BUCKET=x S3_ACCESS_KEY_ID=x S3_SECRET_ACCESS_KEY=x
 * pnpm generate:types`. Nullable, без DEFAULT. Идемпотентно.
 * Зеркало для psql — 20260921_130000.sql, снапшот — 20260921_130000.json.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";
  `)
}
