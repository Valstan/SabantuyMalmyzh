import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * On-site редактирование (PR3): глобалы `home` / `header` / `footer` — редактируемые
 * тексты главной, шапки и подвала. Локализованные скаляры → `*_locales`; массивы-overlay
 * (home.features, home.cultureCards, header.nav) → `*` + `*_locales` (key — не лок.).
 *
 * Enum `_locales` уже существует (общая локализация) — не создаём. DDL снят push-inspect'ом
 * (pg_dump) с dev-push (#017). Идемпотентно: CREATE TABLE/INDEX IF NOT EXISTS, FK через
 * DO/EXCEPTION. Глобалы без versions/drafts (G7 неприменим). Зеркало — 20260619_150000.sql.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "home" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
    CREATE TABLE IF NOT EXISTS "home_locales" (
      "hero_eyebrow" varchar,
      "hero_title_accent" varchar,
      "hero_tagline" varchar,
      "features_eyebrow" varchar,
      "features_title" varchar,
      "culture_eyebrow" varchar,
      "culture_title" varchar,
      "culture_lead" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "home_features" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "home_features_locales" (
      "title" varchar,
      "text" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "home_culture_cards" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "home_culture_cards_locales" (
      "title" varchar,
      "text" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "header" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
    CREATE TABLE IF NOT EXISTS "header_locales" (
      "brand" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "header_nav" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "header_nav_locales" (
      "label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "footer" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
    CREATE TABLE IF NOT EXISTS "footer_locales" (
      "copyright" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    DO $$ BEGIN ALTER TABLE "home_locales" ADD CONSTRAINT "home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_features" ADD CONSTRAINT "home_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_features_locales" ADD CONSTRAINT "home_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_features"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_culture_cards" ADD CONSTRAINT "home_culture_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_culture_cards_locales" ADD CONSTRAINT "home_culture_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_culture_cards"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "header_locales" ADD CONSTRAINT "header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "header_nav" ADD CONSTRAINT "header_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "header_nav_locales" ADD CONSTRAINT "header_nav_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS "home_locales_locale_parent_id_unique" ON "home_locales" ("_locale", "_parent_id");
    CREATE INDEX IF NOT EXISTS "home_features_order_idx" ON "home_features" ("_order");
    CREATE INDEX IF NOT EXISTS "home_features_parent_id_idx" ON "home_features" ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "home_features_locales_locale_parent_id_unique" ON "home_features_locales" ("_locale", "_parent_id");
    CREATE INDEX IF NOT EXISTS "home_culture_cards_order_idx" ON "home_culture_cards" ("_order");
    CREATE INDEX IF NOT EXISTS "home_culture_cards_parent_id_idx" ON "home_culture_cards" ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "home_culture_cards_locales_locale_parent_id_unique" ON "home_culture_cards_locales" ("_locale", "_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "header_locales_locale_parent_id_unique" ON "header_locales" ("_locale", "_parent_id");
    CREATE INDEX IF NOT EXISTS "header_nav_order_idx" ON "header_nav" ("_order");
    CREATE INDEX IF NOT EXISTS "header_nav_parent_id_idx" ON "header_nav" ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "header_nav_locales_locale_parent_id_unique" ON "header_nav_locales" ("_locale", "_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "footer_locales_locale_parent_id_unique" ON "footer_locales" ("_locale", "_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "home_features_locales";
    DROP TABLE IF EXISTS "home_features";
    DROP TABLE IF EXISTS "home_culture_cards_locales";
    DROP TABLE IF EXISTS "home_culture_cards";
    DROP TABLE IF EXISTS "home_locales";
    DROP TABLE IF EXISTS "home";
    DROP TABLE IF EXISTS "header_nav_locales";
    DROP TABLE IF EXISTS "header_nav";
    DROP TABLE IF EXISTS "header_locales";
    DROP TABLE IF EXISTS "header";
    DROP TABLE IF EXISTS "footer_locales";
    DROP TABLE IF EXISTS "footer";
  `)
}
