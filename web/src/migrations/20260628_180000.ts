import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Пост-в-стиле-ВК для «Народной ленты»: одна подпись — несколько файлов. Обложка
 * (файл №1) остаётся в верхнеуровневых полях submissions; доп. файлы №2…№N — в новом
 * массиве media → таблица submissions_media (sub-table массива Payload: _order /
 * _parent_id / id varchar PK + поля медиа) + enum kind + FK на submissions (ON DELETE
 * cascade — drizzle для array sub-table) + 2 индекса (_order, _parent_id).
 *
 * Таблица/enum НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Имена/
 * типы/индексы/FK сняты push-inspect'ом из dev-БД (#017, G81/R10). На проде push
 * отключён → создаёт эта миграция. Идемпотентно (IF NOT EXISTS / DO-EXCEPTION).
 * Аддитивно, без PII. Зеркало для psql — 20260628_180000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN CREATE TYPE "enum_submissions_media_kind" AS ENUM('photo', 'video'); EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "submissions_media" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "kind" "enum_submissions_media_kind" NOT NULL,
      "object_key" varchar NOT NULL,
      "poster_key" varchar,
      "mime" varchar NOT NULL,
      "bytes" numeric,
      "width" numeric,
      "height" numeric,
      "duration_sec" numeric
    );

    DO $$ BEGIN ALTER TABLE "submissions_media" ADD CONSTRAINT "submissions_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "submissions_media_order_idx" ON "submissions_media" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "submissions_media_parent_id_idx" ON "submissions_media" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "submissions_media";
    DO $$ BEGIN DROP TYPE IF EXISTS "enum_submissions_media_kind"; EXCEPTION WHEN undefined_object THEN null; END $$;
  `)
}
