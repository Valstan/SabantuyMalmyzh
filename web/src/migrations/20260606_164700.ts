import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * I3 «Опрос»: новая коллекция Poll Votes (таблица `poll_votes` + enum
 * `enum_poll_votes_option`). Один голос = одна строка; итоги — агрегат count.
 *
 * Таблица НОВАЯ → push на dev создал её без интерактива (G23 не грозит). Точные
 * имена/типы/индексы сняты push-inspect'ом (pg_dump) из dev-БД. На проде push
 * отключён (production) → создаёт эта миграция.
 *
 * Идемпотентно: enum через DO/EXCEPTION, таблица/индексы — IF NOT EXISTS.
 * Зеркало для прямого psql-применения — `20260606_164700.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_poll_votes_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_poll_votes_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "poll_votes_id";
    DROP TABLE IF EXISTS "poll_votes";
    DROP TYPE IF EXISTS "enum_poll_votes_option";
  `)
}
