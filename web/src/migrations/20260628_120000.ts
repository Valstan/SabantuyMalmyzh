import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Закрепление UGC за VK-аккаунтом (PR5B): колонка `owner_visitor` (numeric — Payload
 * number field) на submissions / submission_comments / submission_reactions + btree-индекс
 * на каждой. Хранит PK строки visitors — по нему автор управляет «своим» с ЛЮБОГО
 * устройства (а не только там, где лежит браузерный токен ownerHash). Не PII (числовой id).
 *
 * Колонки аддитивные, nullable → push на dev добавил без интерактива (G23 не грозит).
 * Имена/типы/индексы сняты push-inspect'ом (pg_dump 17) из dev-БД (#017, G81/R10).
 * Идемпотентно (IF NOT EXISTS). Зеркало для psql — 20260628_120000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
    ALTER TABLE "submission_comments" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
    ALTER TABLE "submission_reactions" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
    CREATE INDEX IF NOT EXISTS "submissions_owner_visitor_idx" ON "submissions" USING btree ("owner_visitor");
    CREATE INDEX IF NOT EXISTS "submission_comments_owner_visitor_idx" ON "submission_comments" USING btree ("owner_visitor");
    CREATE INDEX IF NOT EXISTS "submission_reactions_owner_visitor_idx" ON "submission_reactions" USING btree ("owner_visitor");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "submissions_owner_visitor_idx";
    DROP INDEX IF EXISTS "submission_comments_owner_visitor_idx";
    DROP INDEX IF EXISTS "submission_reactions_owner_visitor_idx";
    ALTER TABLE "submissions" DROP COLUMN IF EXISTS "owner_visitor";
    ALTER TABLE "submission_comments" DROP COLUMN IF EXISTS "owner_visitor";
    ALTER TABLE "submission_reactions" DROP COLUMN IF EXISTS "owner_visitor";
  `)
}
