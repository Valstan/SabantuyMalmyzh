-- 20260704_120000: FK дочерних UGC-таблиц → ON DELETE CASCADE (зеркало .ts для psql).
-- Было: ON DELETE SET NULL при NOT NULL-колонках (дефолт drizzle) → жёсткое удаление
-- публикации с лайками/комментами/просмотрами/раундами битвы падало с PG 23502.
-- Данных не трогаем, только пересоздание constraint'ов. Идемпотентно.

ALTER TABLE "submission_reactions" DROP CONSTRAINT IF EXISTS "submission_reactions_submission_id_submissions_id_fk";
ALTER TABLE "submission_reactions"
  ADD CONSTRAINT "submission_reactions_submission_id_submissions_id_fk"
  FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "submission_comments" DROP CONSTRAINT IF EXISTS "submission_comments_submission_id_submissions_id_fk";
ALTER TABLE "submission_comments"
  ADD CONSTRAINT "submission_comments_submission_id_submissions_id_fk"
  FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "submission_views" DROP CONSTRAINT IF EXISTS "submission_views_submission_id_submissions_id_fk";
ALTER TABLE "submission_views"
  ADD CONSTRAINT "submission_views_submission_id_submissions_id_fk"
  FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "photo_battles" DROP CONSTRAINT IF EXISTS "photo_battles_winner_id_submissions_id_fk";
ALTER TABLE "photo_battles"
  ADD CONSTRAINT "photo_battles_winner_id_submissions_id_fk"
  FOREIGN KEY ("winner_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "photo_battles" DROP CONSTRAINT IF EXISTS "photo_battles_loser_id_submissions_id_fk";
ALTER TABLE "photo_battles"
  ADD CONSTRAINT "photo_battles_loser_id_submissions_id_fk"
  FOREIGN KEY ("loser_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
