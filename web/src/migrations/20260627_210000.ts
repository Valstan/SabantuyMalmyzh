import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Владение UGC-контентом анонимом (PR3 «удалить/править своё»): колонка `owner_hash`
 * на submissions / submission_comments / submission_reactions + btree-индекс на каждой.
 * Хранит необратимый хеш браузерного токена X-UGC-Owner — по нему автор удаляет/правит
 * свой контент и отменяет лайк (эндпоинты /api/ugc/*). Не PII (как ip_hash).
 *
 * Колонки аддитивные, nullable → push на dev добавил их без интерактива (G23 не грозит).
 * Имена индексов — конвенция Payload/drizzle <table>_<column>_idx (push-inspect, #017);
 * сверено с 20260627_090000 (submissions_object_key_idx и т.п.). Идемпотентно
 * (IF NOT EXISTS). Зеркало для payload migrate — 20260627_210000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
    ALTER TABLE "submission_comments" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
    ALTER TABLE "submission_reactions" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
    CREATE INDEX IF NOT EXISTS "submissions_owner_hash_idx" ON "submissions" USING btree ("owner_hash");
    CREATE INDEX IF NOT EXISTS "submission_comments_owner_hash_idx" ON "submission_comments" USING btree ("owner_hash");
    CREATE INDEX IF NOT EXISTS "submission_reactions_owner_hash_idx" ON "submission_reactions" USING btree ("owner_hash");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "submissions_owner_hash_idx";
    DROP INDEX IF EXISTS "submission_comments_owner_hash_idx";
    DROP INDEX IF EXISTS "submission_reactions_owner_hash_idx";
    ALTER TABLE "submissions" DROP COLUMN IF EXISTS "owner_hash";
    ALTER TABLE "submission_comments" DROP COLUMN IF EXISTS "owner_hash";
    ALTER TABLE "submission_reactions" DROP COLUMN IF EXISTS "owner_hash";
  `)
}
