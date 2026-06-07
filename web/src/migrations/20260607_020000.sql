-- Mirror of 20260607_020000.ts up() for direct psql apply.
-- Idempotent: safe to run where tables/enum/columns already exist.
--
-- I4 «Розыгрыш призов»: коллекции Raffle (raffle) + RaffleEntry (raffle_entries, ПДн)
-- с перекрёстными FK (winner_id ↔ raffle_id, ON DELETE SET NULL), enum
-- enum_raffle_entries_source, связки в payload_locked_documents_rels.
-- Имена/типы/индексы/FK — push-inspect (pg_dump) из dev-БД.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260607_020000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260607_020000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

DO $$ BEGIN
  CREATE TYPE "public"."enum_raffle_entries_source" AS ENUM('website', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "raffle" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar NOT NULL,
  "description" varchar,
  "prize" varchar,
  "is_open" boolean DEFAULT false,
  "draw_now" boolean DEFAULT false,
  "winner_id" integer,
  "drawn_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "raffle_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" varchar NOT NULL,
  "phone" varchar NOT NULL,
  "raffle_id" integer NOT NULL,
  "consent" boolean DEFAULT false NOT NULL,
  "source" "enum_raffle_entries_source" DEFAULT 'website',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "raffle" ADD CONSTRAINT "raffle_winner_id_raffle_entries_id_fk"
    FOREIGN KEY ("winner_id") REFERENCES "public"."raffle_entries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "raffle_entries" ADD CONSTRAINT "raffle_entries_raffle_id_raffle_id_fk"
    FOREIGN KEY ("raffle_id") REFERENCES "public"."raffle"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "raffle_winner_idx" ON "raffle" USING btree ("winner_id");
CREATE INDEX IF NOT EXISTS "raffle_updated_at_idx" ON "raffle" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "raffle_created_at_idx" ON "raffle" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "raffle_entries_raffle_idx" ON "raffle_entries" USING btree ("raffle_id");
CREATE INDEX IF NOT EXISTS "raffle_entries_updated_at_idx" ON "raffle_entries" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "raffle_entries_created_at_idx" ON "raffle_entries" USING btree ("created_at");

-- Связки для админ-блокировки доков (Payload создаёт на каждую коллекцию).
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "raffle_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "raffle_entries_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_raffle_fk"
    FOREIGN KEY ("raffle_id") REFERENCES "public"."raffle"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_raffle_entries_fk"
    FOREIGN KEY ("raffle_entries_id") REFERENCES "public"."raffle_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_raffle_id_idx" ON "payload_locked_documents_rels" USING btree ("raffle_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_raffle_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("raffle_entries_id");

COMMIT;
