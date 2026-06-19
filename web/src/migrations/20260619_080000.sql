-- Mirror of 20260619_080000.ts up() for direct psql apply.
-- Idempotent: safe to run where columns/types already exist.
--
-- Каталог игр + игра v2 «Угадай по картинке»: quiz_questions.game (enum) +
-- image/image_source; _quiz_questions_v зеркало; quiz_results.game (text).
-- Backfill существующих вопросов → 'sabantuy'. Имена/типы — из payload migrate:create.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260619_080000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260619_080000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

DO $$ BEGIN CREATE TYPE "public"."enum_quiz_questions_game" AS ENUM('sabantuy', 'kartinki'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."enum__quiz_questions_v_version_game" AS ENUM('sabantuy', 'kartinki'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "game" "enum_quiz_questions_game" DEFAULT 'sabantuy';
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "image" varchar;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "image_source" varchar;

ALTER TABLE "_quiz_questions_v" ADD COLUMN IF NOT EXISTS "version_game" "enum__quiz_questions_v_version_game" DEFAULT 'sabantuy';
ALTER TABLE "_quiz_questions_v" ADD COLUMN IF NOT EXISTS "version_image" varchar;
ALTER TABLE "_quiz_questions_v" ADD COLUMN IF NOT EXISTS "version_image_source" varchar;

-- Backfill существующих вопросов в игру v1 (defaultValue колонки — только для новых строк).
UPDATE "quiz_questions" SET "game" = 'sabantuy' WHERE "game" IS NULL;
UPDATE "_quiz_questions_v" SET "version_game" = 'sabantuy' WHERE "version_game" IS NULL;

ALTER TABLE "quiz_results" ADD COLUMN IF NOT EXISTS "game" varchar;

COMMIT;
