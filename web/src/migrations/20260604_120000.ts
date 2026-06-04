import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * season-MVP «Программа»: добавляет поле `venue` (площадка/сцена) в коллекцию Events.
 *
 * Events версионируема (`drafts:true`) → **G7**: добавляем колонку и в зеркальную
 * `_events_v` как `version_venue`, иначе сохранение события → HTTP 500
 * (`errorMissingColumn`) и пустой list-view в админке.
 *
 * Точные имена/типы взяты push-inspect'ом из dev-БД (push:true), где схема уже
 * накатана: `events.venue varchar NULL`, `_events_v.version_venue varchar NULL`.
 * На проде push отключён (production) → дельту накатывает эта миграция.
 *
 * Все ADD/DROP ... IF (NOT) EXISTS — идемпотентно (безопасно где колонка уже есть).
 * Зеркало для прямого psql-применения — `20260604_120000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue" varchar;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_venue" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "events" DROP COLUMN IF EXISTS "venue";
    ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_venue";
  `)
}
