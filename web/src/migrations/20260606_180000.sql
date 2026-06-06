-- Mirror of 20260606_180000.ts up() for direct psql apply.
-- Idempotent: safe to run where type/column already exist.
--
-- I5 «Регистрация на состязания»: добавляет select-поле competitionType в
-- Registrations → enum enum_registrations_competition_type + nullable колонка
-- registrations.competition_type. Коллекция не версионируется → одна таблица (без _v).
-- Имена/тип — push-inspect-конвенция (как enum_poll_votes_option).
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260606_180000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260606_180000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

DO $$ BEGIN
  CREATE TYPE "public"."enum_registrations_competition_type" AS ENUM('koresh', 'skachki', 'meshki', 'beg_v_meshkah', 'kanat', 'girya', 'stolb', 'kids');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "competition_type" "enum_registrations_competition_type";

COMMIT;
