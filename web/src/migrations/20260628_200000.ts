import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * «Фотобитва» — per-фото: мульти-файловые посты дают в битву КАЖДЫЙ кадр, поэтому раунд
 * запоминает не только публикацию (winner/loser), но и ИНДЕКС кадра в ней. Две новые
 * колонки на photo_battles: winner_index / loser_index (numeric DEFAULT 0 — 0 = обложка).
 *
 * Колонки НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Типы/дефолты
 * сняты push-inspect'ом из dev-БД (#017). Идемпотентно (ADD COLUMN IF NOT EXISTS).
 * Аддитивно, без PII. Зеркало для psql — 20260628_200000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "photo_battles" ADD COLUMN IF NOT EXISTS "winner_index" numeric DEFAULT 0;
    ALTER TABLE "photo_battles" ADD COLUMN IF NOT EXISTS "loser_index" numeric DEFAULT 0;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "photo_battles" DROP COLUMN IF EXISTS "loser_index";
    ALTER TABLE "photo_battles" DROP COLUMN IF EXISTS "winner_index";
  `)
}
