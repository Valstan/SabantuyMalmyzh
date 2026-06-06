import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * I5 «Регистрация на состязания»: добавляет select-поле competitionType в коллекцию
 * Registrations → enum `enum_registrations_competition_type` + nullable колонка
 * `registrations.competition_type`. Registrations НЕ версионируется (нет drafts) →
 * затрагивается ОДНА таблица, без `_v`-зеркала (G7 неприменим).
 *
 * Аддитивно (CREATE TYPE + ADD COLUMN, без DROP) → безопасно на проде с данными.
 * Имена/тип — drizzle-конвенция (как enum_poll_votes_option в 20260606_164700).
 * На проде push отключён (production) → колонку создаёт эта миграция.
 *
 * Идемпотентно: enum через DO/EXCEPTION, колонка — IF NOT EXISTS.
 * Зеркало для прямого psql-применения — `20260606_180000.sql`.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_registrations_competition_type" AS ENUM('koresh', 'skachki', 'meshki', 'beg_v_meshkah', 'kanat', 'girya', 'stolb', 'kids');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "competition_type" "enum_registrations_competition_type";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "registrations" DROP COLUMN IF EXISTS "competition_type";
    DROP TYPE IF EXISTS "enum_registrations_competition_type";
  `)
}
