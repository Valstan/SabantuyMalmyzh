-- Mirror of 20260618_160000.ts up() for direct psql apply.
-- Idempotent: safe to run where table/column already exist.
--
-- Счётчик/статистика игры-угадайки: создаёт коллекцию Quiz Results (таблица
-- quiz_results: score/total). Имена/типы/индексы — push-inspect (pg_dump) из dev-БД.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260618_160000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260618_160000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

CREATE TABLE IF NOT EXISTS "quiz_results" (
  "id" serial PRIMARY KEY NOT NULL,
  "score" numeric NOT NULL,
  "total" numeric NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "quiz_results_created_at_idx" ON "quiz_results" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "quiz_results_updated_at_idx" ON "quiz_results" USING btree ("updated_at");

-- Связка для админ-блокировки доков (Payload создаёт на каждую коллекцию).
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "quiz_results_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_quiz_results_fk"
    FOREIGN KEY ("quiz_results_id") REFERENCES "public"."quiz_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_quiz_results_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_results_id");

COMMIT;
