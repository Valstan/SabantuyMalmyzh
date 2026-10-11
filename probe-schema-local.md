# Локальная сверка схемы (probe-schema) — для ручного прогона
# Источник: .github/workflows/probe-schema.yml + docs/PENDING_FOLLOWUPS.md
# База: postgresql://postgres:postgres@127.0.0.1:5432/sabantuy (из web/.env)
# Предыдущий результат (2026-07-28): md5=ec4354859ee3b161ceff08778b0cc9b5, 568 колонок, 73 таблицы, 41 enum.

# Запускать через любой PostgreSQL-клиент (psql, pgAdmin, DBeaver) подключившись к БД sabantuy.
# Команды ниже — copy-paste в SQL-редактор.

SELECT '=== MIGRATIONS ===';
SELECT count(*) FROM payload_migrations;
SELECT name FROM payload_migrations ORDER BY name;

SELECT '=== COUNTS ===';
SELECT 'tables=' || count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
SELECT 'enums=' || count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e';

SELECT '=== COLUMNS ===';
SELECT c.table_name||'|'||c.column_name||'|'||c.udt_name||'|'||c.is_nullable||'|'||coalesce(c.character_maximum_length::text,'')||'|'||coalesce(c.numeric_precision::text,'')
FROM information_schema.columns c
JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
WHERE c.table_schema='public'
ORDER BY 1;

SELECT '=== ENUMS ===';
SELECT t.typname||'|'||string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
FROM pg_type t
JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public'
GROUP BY t.typname
ORDER BY 1;

SELECT '=== CHECKSUM ===';
SELECT md5(string_agg(x, E'\n' ORDER BY x)) FROM (
  SELECT c.table_name||'|'||c.column_name||'|'||c.udt_name||'|'||c.is_nullable||'|'||coalesce(c.character_maximum_length::text,'')||'|'||coalesce(c.numeric_precision::text,'') AS x
  FROM information_schema.columns c
  JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
  WHERE c.table_schema='public'
) s;
