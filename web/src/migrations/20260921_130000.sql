-- Миграция: storage-s3 3.90 — скрытое поле _objectKey у upload-коллекции media.
-- Без колонки select по media падает (поймано на проде после #322). Nullable, без DEFAULT.
-- Зеркало для payload migrate — 20260921_130000.ts.

ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;
