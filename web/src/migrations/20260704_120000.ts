import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Фикс мины схемы UGC: дочерние таблицы submission_reactions / submission_comments /
 * submission_views (submission_id) и photo_battles (winner_id, loser_id) имели
 * NOT NULL-колонки с FK ON DELETE SET NULL (дефолт drizzle для relationship) —
 * жёсткое удаление публикации с лайками/комментами/просмотрами/раундами битвы
 * (например, персоналом из /admin) падало с PG 23502 «NULL нарушает NOT NULL».
 * Сайтовое удаление мягкое (status='removed'), поэтому не стреляло.
 *
 * Меняем FK на ON DELETE CASCADE: реакция/коммент/просмотр/раунд без поста не имеют
 * смысла — удаляются вместе с ним (счётчики постов пересчитываются COUNT'ом, снапшотов
 * по id публикаций нет). Только ALTER CONSTRAINT-ы, данных не трогаем; идемпотентно
 * (DROP IF EXISTS + ADD). down возвращает SET NULL (как было). Зеркало — .sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "submission_reactions" DROP CONSTRAINT IF EXISTS "submission_reactions_submission_id_submissions_id_fk";
    ALTER TABLE "submission_reactions"
      ADD CONSTRAINT "submission_reactions_submission_id_submissions_id_fk"
      FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "submission_comments" DROP CONSTRAINT IF EXISTS "submission_comments_submission_id_submissions_id_fk";
    ALTER TABLE "submission_comments"
      ADD CONSTRAINT "submission_comments_submission_id_submissions_id_fk"
      FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "submission_views" DROP CONSTRAINT IF EXISTS "submission_views_submission_id_submissions_id_fk";
    ALTER TABLE "submission_views"
      ADD CONSTRAINT "submission_views_submission_id_submissions_id_fk"
      FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "photo_battles" DROP CONSTRAINT IF EXISTS "photo_battles_winner_id_submissions_id_fk";
    ALTER TABLE "photo_battles"
      ADD CONSTRAINT "photo_battles_winner_id_submissions_id_fk"
      FOREIGN KEY ("winner_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "photo_battles" DROP CONSTRAINT IF EXISTS "photo_battles_loser_id_submissions_id_fk";
    ALTER TABLE "photo_battles"
      ADD CONSTRAINT "photo_battles_loser_id_submissions_id_fk"
      FOREIGN KEY ("loser_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  `)
}
