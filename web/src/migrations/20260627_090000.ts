import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * «Народная лента» (UGC фото/видео), PR2: новая коллекция Submissions (таблица
 * `submissions`). Одна строка = одна публикация посетителя; медиа лежит в Object
 * Storage (object_key), не в БД. НЕ versioned (нет drafts) → нет `_v`-зеркал (обход G7).
 *
 * Таблица НОВАЯ → push на dev создал её аддитивно, без интерактива (G23 не грозит).
 * Имена/типы/индексы/enum'ы/FK сняты push-inspect'ом (pg_dump) из dev-БД (#017, G81/R10).
 * На проде push отключён (production) → создаёт эта миграция. Идемпотентно: enum/FK —
 * DO/EXCEPTION, таблицы/индексы/колонка-связка — IF NOT EXISTS. Зеркало для прямого
 * psql-применения — `20260627_090000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. enum'ы
    DO $$ BEGIN CREATE TYPE "enum_submissions_kind" AS ENUM('photo', 'video'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum_submissions_phase" AS ENUM('preparation', 'festival'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum_submissions_status" AS ENUM('visible', 'hidden', 'removed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- 2. таблица
    CREATE TABLE IF NOT EXISTS "submissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "kind" "enum_submissions_kind" NOT NULL,
      "object_key" varchar NOT NULL,
      "poster_key" varchar,
      "mime" varchar NOT NULL,
      "bytes" numeric,
      "width" numeric,
      "height" numeric,
      "duration_sec" numeric,
      "author_name" varchar,
      "caption" varchar,
      "phase" "enum_submissions_phase" DEFAULT 'preparation' NOT NULL,
      "consent" boolean DEFAULT false NOT NULL,
      "status" "enum_submissions_status" DEFAULT 'visible',
      "hidden_reason" varchar,
      "like_count" numeric DEFAULT 0,
      "comment_count" numeric DEFAULT 0,
      "report_count" numeric DEFAULT 0,
      "ip_hash" varchar,
      "user_agent" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- 3. индексы (имена — как сгенерил drizzle/PG)
    CREATE INDEX IF NOT EXISTS "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "submissions_object_key_idx" ON "submissions" USING btree ("object_key");
    CREATE INDEX IF NOT EXISTS "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");

    -- 4. связка для админ-блокировки доков (Payload создаёт на каждую коллекцию)
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "submissions_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk"
        FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_submissions_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_submissions_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "submissions_id";
    DROP TABLE IF EXISTS "submissions";
    DROP TYPE IF EXISTS "enum_submissions_status";
    DROP TYPE IF EXISTS "enum_submissions_phase";
    DROP TYPE IF EXISTS "enum_submissions_kind";
  `)
}
