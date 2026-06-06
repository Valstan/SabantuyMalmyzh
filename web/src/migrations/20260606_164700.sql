-- Mirror of 20260606_164700.ts up() for direct psql apply.
-- Idempotent: safe to run where table/enum already exist.
--
-- I3 «Опрос»: создаёт коллекцию Poll Votes (таблица poll_votes + enum
-- enum_poll_votes_option). Имена/типы/индексы — push-inspect (pg_dump) из dev-БД.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260606_164700.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260606_164700', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

DO $$ BEGIN
  CREATE TYPE "public"."enum_poll_votes_option" AS ENUM('koresh', 'skachki', 'stolb', 'meshki', 'kanat', 'motokross');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" serial PRIMARY KEY NOT NULL,
  "option" "enum_poll_votes_option" NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "poll_votes_created_at_idx" ON "poll_votes" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "poll_votes_updated_at_idx" ON "poll_votes" USING btree ("updated_at");

-- Связка для админ-блокировки доков (Payload создаёт на каждую коллекцию).
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "poll_votes_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_poll_votes_fk"
    FOREIGN KEY ("poll_votes_id") REFERENCES "public"."poll_votes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_poll_votes_id_idx" ON "payload_locked_documents_rels" USING btree ("poll_votes_id");

COMMIT;
