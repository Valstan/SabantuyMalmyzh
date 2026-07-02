-- Миграция: коллекция news («Новости праздника» — блог-лента). 4 таблицы
-- (news/news_locales + _news_v/_news_v_locales) + 3 enum'а + связка
-- payload_locked_documents_rels.news_id. Снято push-inspect'ом из dev-БД (#017).
-- На проде push отключён → создаёт эта миграция. Идемпотентно. Зеркало для
-- payload migrate — 20260702_090000.ts.

DO $$ BEGIN CREATE TYPE "enum_news_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__news_v_version_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__news_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "news" (
  "id" serial PRIMARY KEY NOT NULL,
  "cover_id" integer,
  "published_at" timestamp(3) with time zone,
  "slug" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "_status" "enum_news_status" DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS "news_locales" (
  "title" varchar,
  "excerpt" varchar,
  "body" jsonb,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "_news_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "version_cover_id" integer,
  "version_published_at" timestamp(3) with time zone,
  "version_slug" varchar,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" "enum__news_v_version_status" DEFAULT 'draft',
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" "enum__news_v_published_locale",
  "latest" boolean
);
CREATE TABLE IF NOT EXISTS "_news_v_locales" (
  "version_title" varchar,
  "version_excerpt" varchar,
  "version_body" jsonb,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "news" ADD CONSTRAINT "news_cover_id_media_id_fk"
    FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "news_locales" ADD CONSTRAINT "news_locales_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "news"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "news"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_cover_id_media_id_fk"
    FOREIGN KEY ("version_cover_id") REFERENCES "media"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "_news_v_locales" ADD CONSTRAINT "_news_v_locales_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "_news_v"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "news_cover_idx" ON "news" USING btree ("cover_id");
CREATE INDEX IF NOT EXISTS "news_slug_idx" ON "news" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "news_updated_at_idx" ON "news" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "news_created_at_idx" ON "news" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "news__status_idx" ON "news" USING btree ("_status");
CREATE UNIQUE INDEX IF NOT EXISTS "news_locales_locale_parent_id_unique" ON "news_locales" USING btree ("_locale", "_parent_id");
CREATE INDEX IF NOT EXISTS "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_news_v_version_version_cover_idx" ON "_news_v" USING btree ("version_cover_id");
CREATE INDEX IF NOT EXISTS "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
CREATE INDEX IF NOT EXISTS "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
CREATE INDEX IF NOT EXISTS "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
CREATE INDEX IF NOT EXISTS "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
CREATE INDEX IF NOT EXISTS "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "_news_v_snapshot_idx" ON "_news_v" USING btree ("snapshot");
CREATE INDEX IF NOT EXISTS "_news_v_published_locale_idx" ON "_news_v" USING btree ("published_locale");
CREATE INDEX IF NOT EXISTS "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
CREATE UNIQUE INDEX IF NOT EXISTS "_news_v_locales_locale_parent_id_unique" ON "_news_v_locales" USING btree ("_locale", "_parent_id");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "news_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_news_fk"
    FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
