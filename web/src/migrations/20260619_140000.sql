-- Mirror of 20260619_140000.ts up() for direct psql apply.
-- Idempotent: safe to run where columns/constraints/indexes already exist.
--
-- On-site редактирование (PR1): Pages.heroImage (upload→media). Колонки
-- pages.hero_image_id + _pages_v.version_hero_image_id, FK→media(id) ON DELETE SET NULL,
-- индексы. Имена/типы — push-inspect с dev-push (#017).
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260619_140000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260619_140000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "hero_image_id" integer;
ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_hero_image_id" integer;

DO $$ BEGIN
  ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
CREATE INDEX IF NOT EXISTS "_pages_v_version_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");

COMMIT;
