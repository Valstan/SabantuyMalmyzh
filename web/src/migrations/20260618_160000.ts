import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Счётчик/статистика игры-угадайки: новая коллекция Quiz Results (таблица
 * `quiz_results`). Одна строка = одно завершённое прохождение (score из total);
 * на сайте показывается агрегат (число игроков, средний балл, распределение).
 *
 * Таблица НОВАЯ → push на dev создал её аддитивно, без интерактива (G23 не
 * грозит). Точные имена/типы/индексы сняты push-inspect'ом (pg_dump) из dev-БД.
 * На проде push отключён (production) → создаёт эта миграция.
 *
 * Идемпотентно: таблица/индексы/колонка-связка — IF NOT EXISTS, FK — через
 * DO/EXCEPTION. Зеркало для прямого psql-применения — `20260618_160000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_quiz_results_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_quiz_results_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "quiz_results_id";
    DROP TABLE IF EXISTS "quiz_results";
  `)
}
