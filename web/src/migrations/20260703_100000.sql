-- Зеркало 20260703_100000.ts для прямого psql-применения (web-push подписки).
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "endpoint" varchar NOT NULL,
  "p256dh" varchar NOT NULL,
  "auth" varchar NOT NULL,
  "locale" varchar DEFAULT 'ru',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "push_subscriptions_created_at_idx" ON "push_subscriptions" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "push_subscriptions_updated_at_idx" ON "push_subscriptions" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "push_subscriptions_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk"
    FOREIGN KEY ("push_subscriptions_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_push_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("push_subscriptions_id");
