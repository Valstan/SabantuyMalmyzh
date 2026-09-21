import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Payload 3.90: троттлинг forgot-password — новое auth-поле
 * `resetPasswordRequestedAt` у ВСЕХ auth-коллекций, даже без секции
 * `forgotPassword` в конфиге (G388: дефолт `minRequestInterval ?? 15000`
 * ставится раньше гейта). Без колонки первое обращение к `users` падает.
 *
 * Обнаружено детектором `payload generate:types` после обновления 3.75 → 3.90.1
 * (две строки в диффе payload-types.ts). Написано руками по письму brain
 * 2026-09-21 (G388, G81): nullable, без DEFAULT. Идемпотентно.
 * Зеркало для psql — 20260921_120000.sql, снапшот — 20260921_120000.json.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";
  `)
}
