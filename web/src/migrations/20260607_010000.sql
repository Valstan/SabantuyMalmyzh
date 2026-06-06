-- Mirror of 20260607_010000.ts up() for direct psql apply.
-- Idempotent: safe to run where table/enum/column already exist.
--
-- I6 «Подписка на анонс»: коллекция Subscribers (таблица subscribers + enum
-- enum_subscribers_source + UNIQUE-индекс subscribers_email_idx + связка в
-- payload_locked_documents_rels). Коллекция не версионируется → одна таблица.
-- Имена/типы/индексы — push-inspect (pg_dump) из dev-БД.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260607_010000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260607_010000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

DO $$ BEGIN
  CREATE TYPE "public"."enum_subscribers_source" AS ENUM('website', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar NOT NULL,
  "name" varchar,
  "consent" boolean DEFAULT false NOT NULL,
  "source" "enum_subscribers_source" DEFAULT 'website',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "subscribers_created_at_idx" ON "subscribers" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_idx" ON "subscribers" USING btree ("email");
CREATE INDEX IF NOT EXISTS "subscribers_updated_at_idx" ON "subscribers" USING btree ("updated_at");

-- Связка для админ-блокировки доков (Payload создаёт на каждую коллекцию).
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "subscribers_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_subscribers_fk"
    FOREIGN KEY ("subscribers_id") REFERENCES "public"."subscribers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("subscribers_id");

COMMIT;
