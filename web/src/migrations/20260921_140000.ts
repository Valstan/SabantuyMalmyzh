import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Приёмник ВК-конвейера Сарафана (D-093): группа `source` у коллекции news —
 * `vkPostId` (ключ идемпотентности, unique) и `sourceUrl` (атрибуция).
 * Обе колонки nullable: у существующих новостей источника нет. Драфты
 * (`versions.drafts`) → те же колонки в `_news_v` с префиксом `version_`,
 * там индекс обычный (одна версия на пост не гарантируется).
 *
 * Имена индексов — по образцу автогена Казанской (их миграция того же поля).
 * Написано руками по снапшоту; идемпотентно. Зеркало для psql —
 * 20260921_140000.sql, снапшот — 20260921_140000.json.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "source_vk_post_id" varchar;
    ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "source_source_url" varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS "news_source_source_vk_post_id_idx" ON "news" USING btree ("source_vk_post_id");

    ALTER TABLE "_news_v" ADD COLUMN IF NOT EXISTS "version_source_vk_post_id" varchar;
    ALTER TABLE "_news_v" ADD COLUMN IF NOT EXISTS "version_source_source_url" varchar;
    CREATE INDEX IF NOT EXISTS "_news_v_version_source_version_source_vk_post_id_idx" ON "_news_v" USING btree ("version_source_vk_post_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "_news_v_version_source_version_source_vk_post_id_idx";
    ALTER TABLE "_news_v" DROP COLUMN IF EXISTS "version_source_source_url";
    ALTER TABLE "_news_v" DROP COLUMN IF EXISTS "version_source_vk_post_id";
    DROP INDEX IF EXISTS "news_source_source_vk_post_id_idx";
    ALTER TABLE "news" DROP COLUMN IF EXISTS "source_source_url";
    ALTER TABLE "news" DROP COLUMN IF EXISTS "source_vk_post_id";
  `)
}
