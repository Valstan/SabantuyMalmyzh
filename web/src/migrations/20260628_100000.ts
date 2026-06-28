import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Вход через VK ID (PR5A): новая коллекция Visitors (таблица `visitors`) — посетители,
 * вошедшие через ВКонтакте. Хранит vk_id (unique) + имя + аватар + время входа. НЕ
 * versioned (нет drafts) → нет `_v`-зеркал.
 *
 * Таблица НОВАЯ → push на dev создал её аддитивно, без интерактива (G23 не грозит).
 * Имена/типы/индексы/FK сняты push-inspect'ом (pg_dump 17) из dev-БД (#017, G81/R10).
 * На проде push отключён (production) → создаёт эта миграция. Идемпотентно: FK — через
 * DO/EXCEPTION, таблица/индексы/колонка-связка — IF NOT EXISTS. Зеркало для прямого
 * psql-применения — `20260628_100000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. таблица visitors
    CREATE TABLE IF NOT EXISTS "visitors" (
      "id" serial PRIMARY KEY NOT NULL,
      "vk_id" varchar NOT NULL,
      "name" varchar,
      "avatar_url" varchar,
      "last_login_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- 2. индексы (имена — как сгенерил drizzle/PG)
    CREATE INDEX IF NOT EXISTS "visitors_created_at_idx" ON "visitors" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "visitors_updated_at_idx" ON "visitors" USING btree ("updated_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "visitors_vk_id_idx" ON "visitors" USING btree ("vk_id");

    -- 3. связка для админ-блокировки доков (Payload создаёт на каждую коллекцию)
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "visitors_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_visitors_fk"
        FOREIGN KEY ("visitors_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_visitors_id_idx" ON "payload_locked_documents_rels" USING btree ("visitors_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_visitors_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_visitors_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "visitors_id";
    DROP TABLE IF EXISTS "visitors";
  `)
}
