-- Миграция: закрепление UGC за VK-аккаунтом (PR5B). Колонка owner_visitor (numeric) на
-- submissions / submission_comments / submission_reactions + btree-индекс. Хранит PK
-- строки visitors — управление «своим» с любого устройства. Не PII (числовой id).
--
-- Колонки аддитивные, nullable → push на dev добавил без интерактива. Имена/типы/индексы —
-- push-inspect (pg_dump 17, #017, G81/R10). Идемпотентно. Зеркало — 20260628_120000.ts.

ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
ALTER TABLE "submission_comments" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
ALTER TABLE "submission_reactions" ADD COLUMN IF NOT EXISTS "owner_visitor" numeric;
CREATE INDEX IF NOT EXISTS "submissions_owner_visitor_idx" ON "submissions" USING btree ("owner_visitor");
CREATE INDEX IF NOT EXISTS "submission_comments_owner_visitor_idx" ON "submission_comments" USING btree ("owner_visitor");
CREATE INDEX IF NOT EXISTS "submission_reactions_owner_visitor_idx" ON "submission_reactions" USING btree ("owner_visitor");
