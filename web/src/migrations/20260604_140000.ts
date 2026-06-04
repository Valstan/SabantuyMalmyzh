import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * season-MVP «Карта фестиваля»: глобал `festival-map` → таблицы `festival_map`
 * (план-картинка + intro) и `festival_map_points` (массив объектов) + enum типов.
 *
 * DDL снят push-inspect'ом из dev-БД (push:true). Идемпотентно: CREATE TABLE/INDEX
 * IF NOT EXISTS, enum и FK — через DO/EXCEPTION duplicate_object. Глобал без versions
 * → нет `_v`-таблицы (G7 неприменим). Зеркало для psql — `20260604_140000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "enum_festival_map_points_type" AS ENUM('stage', 'food', 'entrance', 'parking', 'wc', 'medical', 'other');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   CREATE TABLE IF NOT EXISTS "festival_map" (
     "id" serial PRIMARY KEY NOT NULL,
     "plan_image_id" integer,
     "intro" varchar,
     "updated_at" timestamp(3) with time zone,
     "created_at" timestamp(3) with time zone
   );

   CREATE TABLE IF NOT EXISTS "festival_map_points" (
     "_order" integer NOT NULL,
     "_parent_id" integer NOT NULL,
     "id" varchar PRIMARY KEY NOT NULL,
     "label" varchar NOT NULL,
     "type" "enum_festival_map_points_type" DEFAULT 'other',
     "note" varchar
   );

   DO $$ BEGIN
     ALTER TABLE "festival_map" ADD CONSTRAINT "festival_map_plan_image_id_media_id_fk" FOREIGN KEY ("plan_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
     ALTER TABLE "festival_map_points" ADD CONSTRAINT "festival_map_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."festival_map"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   CREATE INDEX IF NOT EXISTS "festival_map_plan_image_idx" ON "festival_map" ("plan_image_id");
   CREATE INDEX IF NOT EXISTS "festival_map_points_order_idx" ON "festival_map_points" ("_order");
   CREATE INDEX IF NOT EXISTS "festival_map_points_parent_id_idx" ON "festival_map_points" ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "festival_map_points";
   DROP TABLE IF EXISTS "festival_map";
   DROP TYPE IF EXISTS "enum_festival_map_points_type";
  `)
}
