-- Миграция: приёмник ВК-конвейера Сарафана (D-093) — группа source у news
-- (vkPostId unique + sourceUrl) и её отражение в таблице версий _news_v. Nullable.
-- Зеркало для payload migrate — 20260921_140000.ts.

ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "source_vk_post_id" varchar;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "source_source_url" varchar;
CREATE UNIQUE INDEX IF NOT EXISTS "news_source_source_vk_post_id_idx" ON "news" USING btree ("source_vk_post_id");

ALTER TABLE "_news_v" ADD COLUMN IF NOT EXISTS "version_source_vk_post_id" varchar;
ALTER TABLE "_news_v" ADD COLUMN IF NOT EXISTS "version_source_source_url" varchar;
CREATE INDEX IF NOT EXISTS "_news_v_version_source_version_source_vk_post_id_idx" ON "_news_v" USING btree ("version_source_vk_post_id");
