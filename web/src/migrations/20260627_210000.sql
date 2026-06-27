-- Миграция: владение UGC-контентом анонимом (PR3 «удалить/править своё»). Колонка
-- owner_hash на submissions / submission_comments / submission_reactions + btree-индекс.
-- Необратимый хеш браузерного токена X-UGC-Owner — по нему автор удаляет/правит свой
-- контент и отменяет лайк (/api/ugc/*). Не PII (как ip_hash).
--
-- Колонки аддитивные, nullable → push на dev добавил без интерактива. Имена индексов —
-- конвенция Payload/drizzle <table>_<column>_idx (push-inspect, #017). На проде push
-- отключён → создаёт эта миграция. Идемпотентно. Зеркало для payload migrate —
-- 20260627_210000.ts.

ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
ALTER TABLE "submission_comments" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
ALTER TABLE "submission_reactions" ADD COLUMN IF NOT EXISTS "owner_hash" varchar;
CREATE INDEX IF NOT EXISTS "submissions_owner_hash_idx" ON "submissions" USING btree ("owner_hash");
CREATE INDEX IF NOT EXISTS "submission_comments_owner_hash_idx" ON "submission_comments" USING btree ("owner_hash");
CREATE INDEX IF NOT EXISTS "submission_reactions_owner_hash_idx" ON "submission_reactions" USING btree ("owner_hash");
