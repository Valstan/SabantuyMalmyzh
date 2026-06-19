import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * On-site редактирование (PR1): поле `heroImage` (upload→media) у Pages — чтобы
 * обложку прозовой страницы можно было менять прямо на сайте (раньше обложка =
 * статический pageDecor, не из БД). Аддитивно к версионируемой коллекции:
 * `hero_image_id` в `pages` + `version_hero_image_id` в `_pages_v`, FK→media(id)
 * ON DELETE SET NULL + индексы. DDL снят push-inspect'ом с живого dev-push (#017) —
 * точные имена FK/индексов. Идемпотентно (IF NOT EXISTS / DO-EXCEPTION). Зеркало для
 * psql — 20260619_140000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "hero_image_id" integer;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_hero_image_id" integer;

    DO $$ BEGIN
      ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "pages_hero_image_idx" ON "pages" USING btree ("hero_image_id");
    CREATE INDEX IF NOT EXISTS "_pages_v_version_version_hero_image_idx" ON "_pages_v" USING btree ("version_hero_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "pages_hero_image_idx";
    DROP INDEX IF EXISTS "_pages_v_version_version_hero_image_idx";
    ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_hero_image_id_media_id_fk";
    ALTER TABLE "_pages_v" DROP CONSTRAINT IF EXISTS "_pages_v_version_hero_image_id_media_id_fk";
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "hero_image_id";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_hero_image_id";
  `)
}
