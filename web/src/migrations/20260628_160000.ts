import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Игра «Фотобитва»: парный выбор фото из «Народной ленты». Счётчики на публикации
 * (submissions.battle_wins / battle_shows, numeric DEFAULT 0 — пересчитываются COUNT'ом
 * хуком recountBattle, ОТДЕЛЬНО от лайков) + таблица photo_battles (один раунд =
 * winner+loser) + 2 FK на submissions (ON DELETE set null — как drizzle для relationship)
 * + связка payload_locked_documents_rels.
 *
 * Колонки/таблица НОВЫЕ → push на dev применил без интерактива (G23 не грозит). Имена/
 * типы/индексы/FK сняты push-inspect'ом (pg_dump 17) из dev-БД (#017, G81/R10).
 * Идемпотентно (IF NOT EXISTS / DO-EXCEPTION). Зеркало для psql — 20260628_160000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "battle_wins" numeric DEFAULT 0;
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "battle_shows" numeric DEFAULT 0;

    CREATE TABLE IF NOT EXISTS "photo_battles" (
      "id" serial PRIMARY KEY NOT NULL,
      "winner_id" integer NOT NULL,
      "loser_id" integer NOT NULL,
      "ip_hash" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN ALTER TABLE "photo_battles" ADD CONSTRAINT "photo_battles_winner_id_submissions_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "photo_battles" ADD CONSTRAINT "photo_battles_loser_id_submissions_id_fk" FOREIGN KEY ("loser_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "photo_battles_created_at_idx" ON "photo_battles" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "photo_battles_loser_idx" ON "photo_battles" USING btree ("loser_id");
    CREATE INDEX IF NOT EXISTS "photo_battles_updated_at_idx" ON "photo_battles" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "photo_battles_winner_idx" ON "photo_battles" USING btree ("winner_id");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "photo_battles_id" integer;
    DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photo_battles_fk" FOREIGN KEY ("photo_battles_id") REFERENCES "public"."photo_battles"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_photo_battles_id_idx" ON "payload_locked_documents_rels" USING btree ("photo_battles_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_photo_battles_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_photo_battles_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "photo_battles_id";
    DROP TABLE IF EXISTS "photo_battles";
    ALTER TABLE "submissions" DROP COLUMN IF EXISTS "battle_shows";
    ALTER TABLE "submissions" DROP COLUMN IF EXISTS "battle_wins";
  `)
}
