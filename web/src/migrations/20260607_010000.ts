import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * I6 «Подписка на анонс»: новая коллекция Subscribers (таблица `subscribers` +
 * enum `enum_subscribers_source` + UNIQUE-индекс на email для дедупа + связка
 * payload_locked_documents_rels.subscribers_id). Коллекция НЕ версионируется →
 * затрагивается одна таблица (без `_v`).
 *
 * Таблица НОВАЯ → push на dev создал её без интерактива (G23 не грозит). Точные
 * имена/типы/индексы сняты push-inspect'ом (pg_dump) из dev-БД. На проде push
 * отключён (production) → создаёт эта миграция.
 *
 * Идемпотентно: enum/FK через DO/EXCEPTION, таблица/индексы — IF NOT EXISTS.
 * Зеркало для прямого psql-применения — `20260607_010000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_subscribers_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_subscribers_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "subscribers_id";
    DROP TABLE IF EXISTS "subscribers";
    DROP TYPE IF EXISTS "enum_subscribers_source";
  `)
}
