import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Web-push уведомления: новая коллекция push-subscriptions (таблица
 * `push_subscriptions`) — ЕДИНАЯ подписка браузера на все уведомления сайта
 * (программа «скоро начнётся», Новости, Народная лента; сезонная кампания
 * до 7 июля — см. lib/push.ts). НЕ versioned → нет `_v`-зеркал, НЕ localized.
 *
 * Таблица НОВАЯ → push на dev создал аддитивно, без интерактива. Имена/типы/
 * индексы/FK сняты push-inspect'ом (pg_dump 17) из dev-БД (#017, паттерн
 * visitors 20260628_100000). На проде push отключён → создаёт эта миграция.
 * Идемпотентно: FK — DO/EXCEPTION, таблица/индексы/колонка — IF NOT EXISTS.
 * Зеркало для psql — 20260703_100000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. таблица push_subscriptions
    CREATE TABLE IF NOT EXISTS "push_subscriptions" (
      "id" serial PRIMARY KEY NOT NULL,
      "endpoint" varchar NOT NULL,
      "p256dh" varchar NOT NULL,
      "auth" varchar NOT NULL,
      "locale" varchar DEFAULT 'ru',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- 2. индексы (имена — как сгенерил drizzle/PG)
    CREATE INDEX IF NOT EXISTS "push_subscriptions_created_at_idx" ON "push_subscriptions" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "push_subscriptions_updated_at_idx" ON "push_subscriptions" USING btree ("updated_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");

    -- 3. связка для админ-блокировки доков (Payload создаёт на каждую коллекцию)
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "push_subscriptions_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk"
        FOREIGN KEY ("push_subscriptions_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_push_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("push_subscriptions_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_push_subscriptions_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_push_subscriptions_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "push_subscriptions_id";
    DROP TABLE IF EXISTS "push_subscriptions";
  `)
}
