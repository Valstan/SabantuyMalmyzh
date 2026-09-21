-- Миграция: Payload 3.90 — колонка троттлинга forgot-password у auth-коллекции users (G388).
-- Нужна всем auth-коллекциям, даже без forgotPassword в конфиге. Nullable, без DEFAULT.
-- Зеркало для payload migrate — 20260921_120000.ts.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
