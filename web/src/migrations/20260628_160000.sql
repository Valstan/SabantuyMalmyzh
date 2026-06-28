-- Миграция: игра «Фотобитва» — парный выбор фото из «Народной ленты». Счётчики на
-- публикации (submissions.battle_wins / battle_shows, пересчёт COUNT'ом хуком
-- recountBattle, ОТДЕЛЬНО от лайков) + таблица photo_battles (один раунд = winner+loser).
-- НЕ versioned → без `_v` (обход G7). Два FK на submissions (ON DELETE set null — как
-- drizzle для relationship).
--
-- Колонки/таблица НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Имена/
-- типы/индексы/FK сняты push-inspect'ом (pg_dump) из dev-БД (#017). На проде push
-- отключён → создаёт эта миграция. Идемпотентно: FK — DO/EXCEPTION, таблица/колонки/
-- индексы — IF NOT EXISTS. Зеркало для payload migrate — 20260628_160000.ts.

-- 1. счётчики игры на публикации (отдельно от like_count)
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "battle_wins" numeric DEFAULT 0;
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "battle_shows" numeric DEFAULT 0;

-- 2. таблица раундов
CREATE TABLE IF NOT EXISTS "photo_battles" (
  "id" serial PRIMARY KEY NOT NULL,
  "winner_id" integer NOT NULL,
  "loser_id" integer NOT NULL,
  "ip_hash" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- 3. FK на submissions (relationship, ON DELETE set null — как drizzle)
DO $$ BEGIN ALTER TABLE "photo_battles" ADD CONSTRAINT "photo_battles_winner_id_submissions_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "photo_battles" ADD CONSTRAINT "photo_battles_loser_id_submissions_id_fk" FOREIGN KEY ("loser_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. индексы (имена — как сгенерил drizzle/PG)
CREATE INDEX IF NOT EXISTS "photo_battles_created_at_idx" ON "photo_battles" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "photo_battles_loser_idx" ON "photo_battles" USING btree ("loser_id");
CREATE INDEX IF NOT EXISTS "photo_battles_updated_at_idx" ON "photo_battles" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "photo_battles_winner_idx" ON "photo_battles" USING btree ("winner_id");

-- 5. связка для админ-блокировки доков (Payload создаёт на каждую коллекцию)
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "photo_battles_id" integer;
DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photo_battles_fk" FOREIGN KEY ("photo_battles_id") REFERENCES "public"."photo_battles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_photo_battles_id_idx" ON "payload_locked_documents_rels" USING btree ("photo_battles_id");
