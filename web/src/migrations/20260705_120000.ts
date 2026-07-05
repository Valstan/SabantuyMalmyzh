import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Коллекция vk-candidates — кандидаты «Фотостены» (I8): фото из открытых
 * VK-постов на модерацию. Таблица НОВАЯ + enum статуса + колонка-связь в
 * payload_locked_documents_rels. media FK — SET NULL при nullable-колонке
 * (не G135-мина: NOT NULL нет).
 *
 * Снято push-inspect'ом из dev-БД (pg_dump diff, #017). Идемпотентно:
 * enum/FK через DO/EXCEPTION, таблицы/индексы/колонки IF NOT EXISTS.
 * Зеркало для psql — 20260705_120000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_vk_candidates_status" AS ENUM ('new', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "vk_candidates" (
      "id" serial PRIMARY KEY NOT NULL,
      "vk_key" varchar NOT NULL,
      "status" "enum_vk_candidates_status" DEFAULT 'new' NOT NULL,
      "photo_url" varchar NOT NULL,
      "post_url" varchar NOT NULL,
      "author_name" varchar,
      "author_url" varchar,
      "text" varchar,
      "found_query" varchar,
      "vk_published_at" timestamp(3) with time zone,
      "media_id" integer,
      "download_error" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "vk_candidates" ADD CONSTRAINT "vk_candidates_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "vk_candidates_vk_key_idx" ON "vk_candidates" USING btree ("vk_key");
    CREATE INDEX IF NOT EXISTS "vk_candidates_status_idx" ON "vk_candidates" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "vk_candidates_media_idx" ON "vk_candidates" USING btree ("media_id");
    CREATE INDEX IF NOT EXISTS "vk_candidates_updated_at_idx" ON "vk_candidates" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "vk_candidates_created_at_idx" ON "vk_candidates" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "vk_candidates_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vk_candidates_fk"
        FOREIGN KEY ("vk_candidates_id") REFERENCES "vk_candidates"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vk_candidates_id_idx"
      ON "payload_locked_documents_rels" USING btree ("vk_candidates_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "vk_candidates_id";
    DROP TABLE IF EXISTS "vk_candidates" CASCADE;
    DROP TYPE IF EXISTS "enum_vk_candidates_status";
  `)
}
