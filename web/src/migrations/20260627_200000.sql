-- Миграция: глобал «Прямой эфир» (live-stream) — таблица `live_stream`. Тумблер
-- is_live + ссылка VK (vk_url) + подпись (note); страница /efir встраивает VK Live-плеер
-- (Object Storage эфир не вещает — внешний embed). Глобал = одна строка-синглтон.
--
-- Таблица НОВАЯ → push на dev создал её без интерактива (G23 не грозит). Имена/типы —
-- push-inspect (pg_dump) из dev-БД (#017). На проде push отключён → создаёт эта миграция.
-- Идемпотентно (IF NOT EXISTS). Зеркало для payload migrate — 20260627_200000.ts.
-- У глобалов updated_at/created_at — nullable (без DEFAULT now()).

CREATE TABLE IF NOT EXISTS "live_stream" (
  "id" serial PRIMARY KEY NOT NULL,
  "is_live" boolean DEFAULT false,
  "vk_url" varchar,
  "note" varchar,
  "updated_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone
);
