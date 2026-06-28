-- Миграция: вход через VK ID (PR5A). Новая коллекция Visitors (таблица visitors) —
-- посетители, вошедшие через ВКонтакте: vk_id (unique) + имя + аватар + время входа.
--
-- Таблица новая → push на dev создал аддитивно. Имена/типы/индексы/FK сняты
-- push-inspect'ом (pg_dump 17) из dev-БД (#017, G81/R10). На проде push отключён →
-- создаёт эта миграция. Идемпотентно. Зеркало для payload migrate — 20260628_100000.ts.

CREATE TABLE IF NOT EXISTS "visitors" (
  "id" serial PRIMARY KEY NOT NULL,
  "vk_id" varchar NOT NULL,
  "name" varchar,
  "avatar_url" varchar,
  "last_login_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "visitors_created_at_idx" ON "visitors" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "visitors_updated_at_idx" ON "visitors" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "visitors_vk_id_idx" ON "visitors" USING btree ("vk_id");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "visitors_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_visitors_fk"
    FOREIGN KEY ("visitors_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_visitors_id_idx" ON "payload_locked_documents_rels" USING btree ("visitors_id");
