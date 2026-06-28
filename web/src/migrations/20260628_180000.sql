-- Миграция: пост-в-стиле-ВК для «Народной ленты» — одна подпись, несколько файлов.
-- Обложка (файл №1) остаётся в верхнеуровневых полях submissions; доп. файлы №2…№N —
-- в массиве media → таблица submissions_media (sub-table массива Payload). НЕ versioned
-- → без `_v` (обход G7). FK на submissions (ON DELETE cascade — как drizzle для array).
--
-- Таблица/enum НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Имена/типы/
-- индексы/FK сняты push-inspect'ом из dev-БД (#017). На проде push отключён → создаёт
-- эта миграция. Идемпотентно: enum/FK — DO/EXCEPTION, таблица/индексы — IF NOT EXISTS.
-- Зеркало для payload migrate — 20260628_180000.ts.

-- 1. enum типа медиа sub-таблицы
DO $$ BEGIN CREATE TYPE "enum_submissions_media_kind" AS ENUM('photo', 'video'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. таблица доп. файлов поста (array sub-table: _order / _parent_id / id varchar PK)
CREATE TABLE IF NOT EXISTS "submissions_media" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "kind" "enum_submissions_media_kind" NOT NULL,
  "object_key" varchar NOT NULL,
  "poster_key" varchar,
  "mime" varchar NOT NULL,
  "bytes" numeric,
  "width" numeric,
  "height" numeric,
  "duration_sec" numeric
);

-- 3. FK на родителя (ON DELETE cascade — как drizzle для array sub-table)
DO $$ BEGIN ALTER TABLE "submissions_media" ADD CONSTRAINT "submissions_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. индексы (имена — как сгенерил drizzle/PG)
CREATE INDEX IF NOT EXISTS "submissions_media_order_idx" ON "submissions_media" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "submissions_media_parent_id_idx" ON "submissions_media" USING btree ("_parent_id");
