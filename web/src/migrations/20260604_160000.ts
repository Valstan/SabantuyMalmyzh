import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Двуязычие RU/TT: включение `localization` в payload.config (default+fallback ru).
 *
 * Локализованные поля переезжают из базовых/версионных таблиц в зеркальные
 * `<table>_locales` (по строке на локаль). Это **структурная** правка (не просто
 * ADD COLUMN), поэтому drizzle-push в dev задаёт интерактивные rename-вопросы —
 * на проде push отключён (production), дельту накатывает эта миграция.
 *
 * DDL снят push-inspect'ом (#017): включили localization → dev push на пустую
 * локальную БД создал каноничную схему → `pg_dump --schema-only` восьми
 * `*_locales` таблиц (точные имена/типы/FK/уникальные индексы). Прод-БД пуста →
 * перенос колонок без потери данных (DROP COLUMN на пустых таблицах безопасен).
 *
 * Локализованные поля:
 *   events:       title, summary, location, venue, content  (+ зеркало _events_v)
 *   pages:        title, content                             (+ зеркало _pages_v)
 *   gallery:      title, description                         (+ зеркало _gallery_v)
 *   media:        alt, caption
 *   festival_map: intro
 * Массивы (gallery.photos.caption, festival_map.points.label/note) НЕ локализованы
 * в MVP — иначе медиа-связи дублируются по локалям (документировано в handoff).
 *
 * Идемпотентно: CREATE TYPE/CONSTRAINT в DO-блоках (duplicate_object → null),
 * таблицы/колонки/индексы — IF (NOT) EXISTS. Зеркало для psql — `20260604_160000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Новые enum-типы (локаль + published_locale на версионных таблицах)
    DO $$ BEGIN CREATE TYPE "_locales" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum__events_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum__gallery_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum__pages_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- 2. _locales таблицы (локализованные поля переезжают сюда)
    CREATE TABLE IF NOT EXISTS "events_locales" (
      "title" varchar,
      "summary" varchar,
      "location" varchar,
      "venue" varchar,
      "content" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "_events_v_locales" (
      "version_title" varchar,
      "version_summary" varchar,
      "version_location" varchar,
      "version_venue" varchar,
      "version_content" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "pages_locales" (
      "title" varchar,
      "content" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "_pages_v_locales" (
      "version_title" varchar,
      "version_content" jsonb,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "gallery_locales" (
      "title" varchar,
      "description" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "_gallery_v_locales" (
      "version_title" varchar,
      "version_description" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "media_locales" (
      "alt" varchar,
      "caption" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "festival_map_locales" (
      "intro" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    -- 3. Уникальные индексы (одна строка на локаль) + FK на родителя (cascade)
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

    -- 5. Снять локализованные колонки с базовых/версионных таблиц (переехали в *_locales)
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Вернуть локализованные колонки на базовые/версионные таблицы
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "summary" varchar;
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "location" varchar;
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue" varchar;
    ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "content" jsonb;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_title" varchar;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_summary" varchar;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_location" varchar;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_venue" varchar;
    ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_content" jsonb;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "content" jsonb;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_title" varchar;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_content" jsonb;
    ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "description" varchar;
    ALTER TABLE "_gallery_v" ADD COLUMN IF NOT EXISTS "version_title" varchar;
    ALTER TABLE "_gallery_v" ADD COLUMN IF NOT EXISTS "version_description" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "caption" varchar;
    ALTER TABLE "festival_map" ADD COLUMN IF NOT EXISTS "intro" varchar;

    ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "snapshot";
    ALTER TABLE "_events_v" DROP COLUMN IF EXISTS "published_locale";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "snapshot";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "published_locale";
    ALTER TABLE "_gallery_v" DROP COLUMN IF EXISTS "snapshot";
    ALTER TABLE "_gallery_v" DROP COLUMN IF EXISTS "published_locale";

    DROP TABLE IF EXISTS "events_locales";
    DROP TABLE IF EXISTS "_events_v_locales";
    DROP TABLE IF EXISTS "pages_locales";
    DROP TABLE IF EXISTS "_pages_v_locales";
    DROP TABLE IF EXISTS "gallery_locales";
    DROP TABLE IF EXISTS "_gallery_v_locales";
    DROP TABLE IF EXISTS "media_locales";
    DROP TABLE IF EXISTS "festival_map_locales";

    DROP TYPE IF EXISTS "enum__events_v_published_locale";
    DROP TYPE IF EXISTS "enum__gallery_v_published_locale";
    DROP TYPE IF EXISTS "enum__pages_v_published_locale";
    DROP TYPE IF EXISTS "_locales";
  `)
}
