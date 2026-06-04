-- Mirror of 20260604_160000.ts up() for direct psql apply.
-- Idempotent: CREATE ... IF (NOT) EXISTS; enum/FK через DO/EXCEPTION duplicate_object.
--
-- Двуязычие RU/TT: включение localization. Локализованные поля переезжают из
-- базовых/версионных таблиц в зеркальные "<table>_locales". DDL снят push-inspect'ом
-- (#017): dev push на пустую БД + pg_dump восьми *_locales таблиц.
-- Прод-БД пуста → DROP COLUMN на пустых таблицах безопасен.
--
-- Применять на проде ДО merge кода (через apply-migration.yml или psql):
--   psql "$DATABASE_URL" -f web/src/migrations/20260604_160000.sql
--   + запись в payload_migrations (см. apply-migration.yml).

BEGIN;

-- 1. Новые enum-типы
DO $$ BEGIN CREATE TYPE "_locales" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__events_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__gallery_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__pages_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. _locales таблицы
CREATE TABLE IF NOT EXISTS "events_locales" (
  "title" varchar, "summary" varchar, "location" varchar, "venue" varchar, "content" jsonb,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "_events_v_locales" (
  "version_title" varchar, "version_summary" varchar, "version_location" varchar, "version_venue" varchar, "version_content" jsonb,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "pages_locales" (
  "title" varchar, "content" jsonb,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "_pages_v_locales" (
  "version_title" varchar, "version_content" jsonb,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "gallery_locales" (
  "title" varchar, "description" varchar,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "_gallery_v_locales" (
  "version_title" varchar, "version_description" varchar,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "media_locales" (
  "alt" varchar, "caption" varchar,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "festival_map_locales" (
  "intro" varchar,
  "id" serial PRIMARY KEY NOT NULL, "_locale" "_locales" NOT NULL, "_parent_id" integer NOT NULL
);

-- 3. Уникальные индексы + FK на родителя (cascade)
CREATE UNIQUE INDEX IF NOT EXISTS "events_locales_locale_parent_id_unique" ON "events_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "_events_v_locales_locale_parent_id_unique" ON "_events_v_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "gallery_locales_locale_parent_id_unique" ON "gallery_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "_gallery_v_locales_locale_parent_id_unique" ON "_gallery_v_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale", "_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "festival_map_locales_locale_parent_id_unique" ON "festival_map_locales" USING btree ("_locale", "_parent_id");

DO $$ BEGIN ALTER TABLE "events_locales" ADD CONSTRAINT "events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "events"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_events_v_locales" ADD CONSTRAINT "_events_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_events_v"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "gallery_locales" ADD CONSTRAINT "gallery_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "gallery"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_gallery_v_locales" ADD CONSTRAINT "_gallery_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_gallery_v"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "media"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "festival_map_locales" ADD CONSTRAINT "festival_map_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "festival_map"("id") ON DELETE cascade; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Версионным таблицам — служебные колонки локализации
ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "snapshot" boolean;
ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "published_locale" "enum__events_v_published_locale";
ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "snapshot" boolean;
ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "published_locale" "enum__pages_v_published_locale";
ALTER TABLE "_gallery_v" ADD COLUMN IF NOT EXISTS "snapshot" boolean;
ALTER TABLE "_gallery_v" ADD COLUMN IF NOT EXISTS "published_locale" "enum__gallery_v_published_locale";

-- 5. Снять локализованные колонки с базовых/версионных таблиц
ALTER TABLE "events" DROP COLUMN IF EXISTS "title";
ALTER TABLE "events" DROP COLUMN IF EXISTS "summary";
ALTER TABLE "events" DROP COLUMN IF EXISTS "location";
ALTER TABLE "events" DROP COLUMN IF EXISTS "venue";
ALTER TABLE "events" DROP COLUMN IF EXISTS "content";
ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_title";
ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_summary";
ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_location";
ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_venue";
ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "version_content";
ALTER TABLE "pages" DROP COLUMN IF EXISTS "title";
ALTER TABLE "pages" DROP COLUMN IF EXISTS "content";
ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_title";
ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_content";
ALTER TABLE "gallery" DROP COLUMN IF EXISTS "title";
ALTER TABLE "gallery" DROP COLUMN IF EXISTS "description";
ALTER TABLE "_gallery_v" DROP COLUMN IF EXISTS "version_title";
ALTER TABLE "_gallery_v" DROP COLUMN IF EXISTS "version_description";
ALTER TABLE "media" DROP COLUMN IF EXISTS "alt";
ALTER TABLE "media" DROP COLUMN IF EXISTS "caption";
ALTER TABLE "festival_map" DROP COLUMN IF EXISTS "intro";

COMMIT;
