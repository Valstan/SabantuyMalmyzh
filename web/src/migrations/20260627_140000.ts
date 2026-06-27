import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * «Народная лента» PR3: коллекции взаимодействия —
 *   submission_reactions (лайки), submission_comments (комментарии, постмодерация),
 *   content_reports (жалобы → авто-скрытие на пороге).
 * Все НЕ versioned → без `_v`-зеркал (обход G7). Реакции/комменты ссылаются на
 * submissions (FK submission_id ON DELETE SET NULL — как drizzle сгенерил для
 * relationship; зеркало raffle_entries). Жалобы полиморфны (target_type+target_id).
 *
 * Таблицы НОВЫЕ → push на dev создал их без интерактива (G23 не грозит). Имена/типы/
 * индексы/enum'ы/FK сняты push-inspect'ом (pg_dump) из dev-БД (#017, G81/R10). На проде
 * push отключён → создаёт эта миграция. Идемпотентно: enum/FK — DO/EXCEPTION, таблицы/
 * индексы/колонки-связки — IF NOT EXISTS. Зеркало для psql — 20260627_140000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. enum'ы
    DO $$ BEGIN CREATE TYPE "enum_submission_comments_status" AS ENUM('visible', 'hidden', 'removed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN CREATE TYPE "enum_content_reports_target_type" AS ENUM('submission', 'comment'); EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- 2. таблицы
    CREATE TABLE IF NOT EXISTS "submission_reactions" (
      "id" serial PRIMARY KEY NOT NULL,
      "submission_id" integer NOT NULL,
      "ip_hash" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "submission_comments" (
      "id" serial PRIMARY KEY NOT NULL,
      "submission_id" integer NOT NULL,
      "author_name" varchar,
      "body" varchar NOT NULL,
      "status" "enum_submission_comments_status" DEFAULT 'visible',
      "hidden_reason" varchar,
      "report_count" numeric DEFAULT 0,
      "ip_hash" varchar,
      "user_agent" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "content_reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "target_type" "enum_content_reports_target_type" NOT NULL,
      "target_id" numeric NOT NULL,
      "reason" varchar,
      "ip_hash" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- 3. FK на submissions (relationship, ON DELETE set null — как drizzle)
    DO $$ BEGIN ALTER TABLE "submission_reactions" ADD CONSTRAINT "submission_reactions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

    -- 4. индексы (имена — как сгенерил drizzle/PG)
    CREATE INDEX IF NOT EXISTS "submission_reactions_created_at_idx" ON "submission_reactions" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "submission_reactions_submission_idx" ON "submission_reactions" USING btree ("submission_id");
    CREATE INDEX IF NOT EXISTS "submission_reactions_updated_at_idx" ON "submission_reactions" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "submission_comments_created_at_idx" ON "submission_comments" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "submission_comments_submission_idx" ON "submission_comments" USING btree ("submission_id");
    CREATE INDEX IF NOT EXISTS "submission_comments_updated_at_idx" ON "submission_comments" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "content_reports_created_at_idx" ON "content_reports" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "content_reports_updated_at_idx" ON "content_reports" USING btree ("updated_at");

    -- 5. связки для админ-блокировки доков (Payload создаёт на каждую коллекцию)
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "submission_reactions_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "submission_comments_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "content_reports_id" integer;
    DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submission_reactions_fk" FOREIGN KEY ("submission_reactions_id") REFERENCES "public"."submission_reactions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submission_comments_fk" FOREIGN KEY ("submission_comments_id") REFERENCES "public"."submission_comments"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_reports_fk" FOREIGN KEY ("content_reports_id") REFERENCES "public"."content_reports"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submission_reactions_id_idx" ON "payload_locked_documents_rels" USING btree ("submission_reactions_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submission_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("submission_comments_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_content_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("content_reports_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_submission_reactions_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_submission_comments_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_reports_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_submission_reactions_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_submission_comments_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_content_reports_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "submission_reactions_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "submission_comments_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "content_reports_id";
    DROP TABLE IF EXISTS "submission_reactions";
    DROP TABLE IF EXISTS "submission_comments";
    DROP TABLE IF EXISTS "content_reports";
    DROP TYPE IF EXISTS "enum_submission_comments_status";
    DROP TYPE IF EXISTS "enum_content_reports_target_type";
  `)
}
