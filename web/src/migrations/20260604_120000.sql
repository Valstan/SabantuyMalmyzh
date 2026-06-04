-- Mirror of 20260604_120000.ts up() for direct psql apply.
-- Idempotent: safe to run where columns already exist.
--
-- season-MVP «Программа»: добавляет events.venue (+ _events_v.version_venue — G7,
-- версионируемая коллекция). Точные имена/типы — push-inspect из dev-БД.
--
-- Применять на проде ДО merge кода (push в production отключён):
--   psql "$DATABASE_URL" -f web/src/migrations/20260604_120000.sql
--   psql "$DATABASE_URL" -c "INSERT INTO payload_migrations (name, batch) \
--     VALUES ('20260604_120000', (SELECT COALESCE(MAX(batch),0)+1 FROM payload_migrations));"

BEGIN;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue" varchar;
ALTER TABLE "_events_v" ADD COLUMN IF NOT EXISTS "version_venue" varchar;

COMMIT;
