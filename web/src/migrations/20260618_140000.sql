-- Миграция: коллекция quiz-questions (познавательная игра-«угадайка», директива
-- brain 2026-06-18). Версионируемая (drafts) + localized-подполя в массиве вариантов
-- → восемь таблиц (база/_locales/options/options_locales и их _v-зеркала) + девять
-- enum'ов + связка payload_locked_documents_rels.quiz_questions_id.
--
-- Все таблицы НОВЫЕ → push на dev создал их без интерактива (G23 не грозит). Имена/
-- типы/индексы/FK сняты push-inspect'ом (pg_dump) из dev-БД (#017). На проде push
-- отключён (production) → создаёт эта миграция. Идемпотентно: enum/FK — DO/EXCEPTION,
-- таблицы/индексы — IF NOT EXISTS. Зеркало для payload migrate — 20260618_140000.ts.
-- `_locales` enum уже существует (создан 20260604_160000) — не пересоздаём.

-- 1. enum'ы
DO $$ BEGIN CREATE TYPE "enum_quiz_questions_theme" AS ENUM('sabantuy', 'history', 'geography', 'people', 'language', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_quiz_questions_format" AS ENUM('choice', 'trueMyth', 'translate'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_quiz_questions_difficulty" AS ENUM('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum_quiz_questions_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__quiz_questions_v_version_theme" AS ENUM('sabantuy', 'history', 'geography', 'people', 'language', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__quiz_questions_v_version_format" AS ENUM('choice', 'trueMyth', 'translate'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__quiz_questions_v_version_difficulty" AS ENUM('easy', 'medium', 'hard'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__quiz_questions_v_version_status" AS ENUM('draft', 'published'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "enum__quiz_questions_v_published_locale" AS ENUM('ru', 'tt'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. основные таблицы
CREATE TABLE IF NOT EXISTS "quiz_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "theme" "enum_quiz_questions_theme" DEFAULT 'sabantuy',
  "format" "enum_quiz_questions_format" DEFAULT 'choice',
  "difficulty" "enum_quiz_questions_difficulty" DEFAULT 'medium',
  "source" varchar,
  "order" numeric,
  "key" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "_status" "enum_quiz_questions_status" DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS "quiz_questions_locales" (
  "prompt" varchar,
  "explanation" varchar,
  "hint" varchar,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "quiz_questions_options" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "correct" boolean DEFAULT false
);
CREATE TABLE IF NOT EXISTS "quiz_questions_options_locales" (
  "text" varchar,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" varchar NOT NULL
);

-- 3. версионные зеркала (_v)
CREATE TABLE IF NOT EXISTS "_quiz_questions_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "version_theme" "enum__quiz_questions_v_version_theme" DEFAULT 'sabantuy',
  "version_format" "enum__quiz_questions_v_version_format" DEFAULT 'choice',
  "version_difficulty" "enum__quiz_questions_v_version_difficulty" DEFAULT 'medium',
  "version_source" varchar,
  "version_order" numeric,
  "version_key" varchar,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" "enum__quiz_questions_v_version_status" DEFAULT 'draft',
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "published_locale" "enum__quiz_questions_v_published_locale",
  "latest" boolean
);
CREATE TABLE IF NOT EXISTS "_quiz_questions_v_locales" (
  "version_prompt" varchar,
  "version_explanation" varchar,
  "version_hint" varchar,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "_quiz_questions_v_version_options" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial PRIMARY KEY NOT NULL,
  "correct" boolean DEFAULT false,
  "_uuid" varchar
);
CREATE TABLE IF NOT EXISTS "_quiz_questions_v_version_options_locales" (
  "text" varchar,
  "id" serial PRIMARY KEY NOT NULL,
  "_locale" "_locales" NOT NULL,
  "_parent_id" integer NOT NULL
);

-- 4. внешние ключи (идемпотентно)
DO $$ BEGIN ALTER TABLE "quiz_questions_locales" ADD CONSTRAINT "quiz_questions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "quiz_questions_options" ADD CONSTRAINT "quiz_questions_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "quiz_questions_options_locales" ADD CONSTRAINT "quiz_questions_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quiz_questions_options"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_quiz_questions_v" ADD CONSTRAINT "_quiz_questions_v_parent_id_quiz_questions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quiz_questions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_quiz_questions_v_locales" ADD CONSTRAINT "_quiz_questions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quiz_questions_v"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_quiz_questions_v_version_options" ADD CONSTRAINT "_quiz_questions_v_version_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quiz_questions_v"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "_quiz_questions_v_version_options_locales" ADD CONSTRAINT "_quiz_questions_v_version_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quiz_questions_v_version_options"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. индексы (имена — как сгенерил drizzle/PG, в т.ч. усечённые до 63 символов)
CREATE INDEX IF NOT EXISTS "quiz_questions__status_idx" ON "quiz_questions" USING btree ("_status");
CREATE INDEX IF NOT EXISTS "quiz_questions_created_at_idx" ON "quiz_questions" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_key_idx" ON "quiz_questions" USING btree ("key");
CREATE INDEX IF NOT EXISTS "quiz_questions_updated_at_idx" ON "quiz_questions" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_locales_locale_parent_id_unique" ON "quiz_questions_locales" USING btree ("_locale","_parent_id");
CREATE INDEX IF NOT EXISTS "quiz_questions_options_order_idx" ON "quiz_questions_options" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "quiz_questions_options_parent_id_idx" ON "quiz_questions_options" USING btree ("_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "quiz_questions_options_locales_locale_parent_id_unique" ON "quiz_questions_options_locales" USING btree ("_locale","_parent_id");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_created_at_idx" ON "_quiz_questions_v" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_latest_idx" ON "_quiz_questions_v" USING btree ("latest");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_parent_idx" ON "_quiz_questions_v" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_published_locale_idx" ON "_quiz_questions_v" USING btree ("published_locale");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_snapshot_idx" ON "_quiz_questions_v" USING btree ("snapshot");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_updated_at_idx" ON "_quiz_questions_v" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_version__status_idx" ON "_quiz_questions_v" USING btree ("version__status");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_version_created_at_idx" ON "_quiz_questions_v" USING btree ("version_created_at");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_version_key_idx" ON "_quiz_questions_v" USING btree ("version_key");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_version_updated_at_idx" ON "_quiz_questions_v" USING btree ("version_updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "_quiz_questions_v_locales_locale_parent_id_unique" ON "_quiz_questions_v_locales" USING btree ("_locale","_parent_id");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_options_order_idx" ON "_quiz_questions_v_version_options" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "_quiz_questions_v_version_options_parent_id_idx" ON "_quiz_questions_v_version_options" USING btree ("_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS "_quiz_questions_v_version_options_locales_locale_parent_id_u" ON "_quiz_questions_v_version_options_locales" USING btree ("_locale","_parent_id");

-- 6. связка для админ-блокировки доков (Payload создаёт на каждую коллекцию)
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "quiz_questions_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_quiz_questions_fk"
    FOREIGN KEY ("quiz_questions_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_quiz_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("quiz_questions_id");
