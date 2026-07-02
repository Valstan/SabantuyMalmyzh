import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Массив `videos` у коллекции news (видео по ссылке VK/Rutube/YouTube — плеер
 * без заливки файла; заявка владельца 2026-07-02). Две array-подтаблицы:
 * news_videos + _news_v_version_videos (версионное зеркало). Поля НЕ localized.
 *
 * Таблицы НОВЫЕ → push на dev создал без интерактива; имена/типы/индексы/FK
 * сняты push-inspect'ом (pg_dump diff). На проде push отключён → создаёт эта
 * миграция. Идемпотентно: FK через DO/EXCEPTION, таблицы/индексы IF NOT EXISTS.
 * Зеркало для psql — 20260702_150000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "news_videos" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "url" varchar,
      "title" varchar
    );
    CREATE TABLE IF NOT EXISTS "_news_v_version_videos" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "url" varchar,
      "title" varchar,
      "_uuid" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "news_videos" ADD CONSTRAINT "news_videos_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "news"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      ALTER TABLE "_news_v_version_videos" ADD CONSTRAINT "_news_v_version_videos_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "_news_v"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "news_videos_order_idx" ON "news_videos" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "news_videos_parent_id_idx" ON "news_videos" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_news_v_version_videos_order_idx" ON "_news_v_version_videos" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_news_v_version_videos_parent_id_idx" ON "_news_v_version_videos" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_news_v_version_videos" CASCADE;
    DROP TABLE IF EXISTS "news_videos" CASCADE;
  `)
}
