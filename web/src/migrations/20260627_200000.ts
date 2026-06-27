import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Глобал «Прямой эфир» (live broadcast): таблица `live_stream`. Тумблер isLive +
 * ссылка VK (vkUrl) + подпись (note) — организатор включает эфир в /admin, страница
 * /efir встраивает VK-плеер. Object Storage эфир не вещает — это внешний VK Live embed.
 *
 * Таблица НОВАЯ (глобал — одна строка-синглтон) → push на dev создал её без интерактива.
 * Имена/типы сняты push-inspect'ом (pg_dump) из dev-БД (#017). Идемпотентно. Зеркало —
 * 20260627_200000.sql. У глобалов updated/created — nullable (без DEFAULT now()).
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "live_stream" (
      "id" serial PRIMARY KEY NOT NULL,
      "is_live" boolean DEFAULT false,
      "vk_url" varchar,
      "note" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "live_stream";
  `)
}
