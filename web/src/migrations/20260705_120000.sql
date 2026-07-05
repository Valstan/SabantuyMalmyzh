-- Миграция: коллекция vk-candidates — кандидаты «Фотостены» (I8, фото из VK на модерацию).
-- Новая таблица + enum + колонка-связь в payload_locked_documents_rels.
-- Снято push-inspect'ом из dev-БД (#017). Идемпотентно.
-- Зеркало для payload migrate — 20260705_120000.ts.

DO $$ BEGIN
  CREATE TYPE "enum_vk_candidates_status" AS ENUM ('new', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "vk_candidates" (
  "id" serial PRIMARY KEY NOT NULL,
  "vk_key" varchar NOT NULL,
  "status" "enum_vk_candidates_status" DEFAULT 'new' NOT NULL,
  "photo_url" varchar NOT NULL,
  "post_url" varchar NOT NULL,
  "author_name" varchar,
  "author_url" varchar,
  "text" varchar,
  "found_query" varchar,
  "vk_published_at" timestamp(3) with time zone,
  "media_id" integer,
  "download_error" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "vk_candidates" ADD CONSTRAINT "vk_candidates_media_id_media_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "vk_candidates_vk_key_idx" ON "vk_candidates" USING btree ("vk_key");
CREATE INDEX IF NOT EXISTS "vk_candidates_status_idx" ON "vk_candidates" USING btree ("status");
CREATE INDEX IF NOT EXISTS "vk_candidates_media_idx" ON "vk_candidates" USING btree ("media_id");
CREATE INDEX IF NOT EXISTS "vk_candidates_updated_at_idx" ON "vk_candidates" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "vk_candidates_created_at_idx" ON "vk_candidates" USING btree ("created_at");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "vk_candidates_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vk_candidates_fk"
    FOREIGN KEY ("vk_candidates_id") REFERENCES "vk_candidates"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vk_candidates_id_idx"
  ON "payload_locked_documents_rels" USING btree ("vk_candidates_id");
