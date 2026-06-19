import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Каталог игр + игра v2 «Угадай по картинке». Аддитивно к версионируемой коллекции
 * quiz-questions: поле `game` (enum sabantuy/kartinki) + `image`/`image_source`
 * (картинка и ссылка-источник). Плюс `game` (text) в quiz_results — раздельная
 * статистика по играм.
 *
 * Колонки/типы аддитивны (ADD COLUMN, новые enum) — push на dev накатывает чисто,
 * прод-DROP не грозит (G7). Точные имена/типы сняты из `payload migrate:create`
 * (полная схема) — здесь оставлен только инкремент. Backfill: существующие
 * вопросы → игра 'sabantuy' (v1), т.к. defaultValue колонки применяется лишь к
 * новым строкам. Идемпотентно (IF NOT EXISTS / DO-EXCEPTION). Зеркало для psql —
 * `20260619_080000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "quiz_questions" DROP COLUMN IF EXISTS "game";
    ALTER TABLE "quiz_questions" DROP COLUMN IF EXISTS "image";
    ALTER TABLE "quiz_questions" DROP COLUMN IF EXISTS "image_source";
    ALTER TABLE "_quiz_questions_v" DROP COLUMN IF EXISTS "version_game";
    ALTER TABLE "_quiz_questions_v" DROP COLUMN IF EXISTS "version_image";
    ALTER TABLE "_quiz_questions_v" DROP COLUMN IF EXISTS "version_image_source";
    ALTER TABLE "quiz_results" DROP COLUMN IF EXISTS "game";
    DROP TYPE IF EXISTS "public"."enum_quiz_questions_game";
    DROP TYPE IF EXISTS "public"."enum__quiz_questions_v_version_game";
  `)
}
