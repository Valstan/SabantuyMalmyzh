import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * «Народная лента»: ПРОСМОТРЫ публикаций. Колонка submissions.view_count (агрегат,
 * numeric DEFAULT 0 — пересчитывается COUNT'ом хуком recountViews) + таблица
 * submission_views (одна строка = один уникальный зритель, дедуп по owner_hash, иначе
 * ip_hash) + FK на submissions (ON DELETE set null — как drizzle для relationship) +
 * связка payload_locked_documents_rels (Payload создаёт на каждую коллекцию).
 *
 * Колонка/таблица НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Имена/
 * типы/индексы/FK сняты push-inspect'ом (pg_dump 17) из dev-БД (#017, G81/R10).
 * Идемпотентно (IF NOT EXISTS / DO-EXCEPTION). Зеркало для psql — 20260628_140000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "view_count" numeric DEFAULT 0;

    CREATE TABLE IF NOT EXISTS "submission_views" (
      "id" serial PRIMARY KEY NOT NULL,
      "submission_id" integer NOT NULL,
      "ip_hash" varchar,
      "owner_hash" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN ALTER TABLE "submission_views" ADD CONSTRAINT "submission_views_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "submission_views_created_at_idx" ON "submission_views" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "submission_views_owner_hash_idx" ON "submission_views" USING btree ("owner_hash");
    CREATE INDEX IF NOT EXISTS "submission_views_submission_idx" ON "submission_views" USING btree ("submission_id");
    CREATE INDEX IF NOT EXISTS "submission_views_updated_at_idx" ON "submission_views" USING btree ("updated_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "submission_views_id" integer;
    DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submission_views_fk" FOREIGN KEY ("submission_views_id") REFERENCES "public"."submission_views"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submission_views_id_idx" ON "payload_locked_documents_rels" USING btree ("submission_views_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_submission_views_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_submission_views_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "submission_views_id";
    DROP TABLE IF EXISTS "submission_views";
    ALTER TABLE "submissions" DROP COLUMN IF EXISTS "view_count";
  `)
}
