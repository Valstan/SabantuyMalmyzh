-- Миграция: «Фотобитва» per-фото — раунд запоминает индекс кадра поста (мульти-файловые
-- посты дают в битву каждый кадр, не только обложку). Две колонки на photo_battles:
-- winner_index / loser_index (numeric DEFAULT 0 — 0 = обложка).
--
-- Колонки НОВЫЕ → push на dev применил без интерактива. Типы/дефолты сняты push-inspect'ом
-- из dev-БД (#017). На проде push отключён → создаёт эта миграция. Идемпотентно
-- (ADD COLUMN IF NOT EXISTS). Зеркало для payload migrate — 20260628_200000.ts.

ALTER TABLE "photo_battles" ADD COLUMN IF NOT EXISTS "winner_index" numeric DEFAULT 0;
ALTER TABLE "photo_battles" ADD COLUMN IF NOT EXISTS "loser_index" numeric DEFAULT 0;
