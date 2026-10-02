-- Полный скан ссылок на Media (read-only, только SELECT).
--
-- Задача: Media, на которую никто не ссылается, — кандидаты на удаление
-- (PENDING: «сироты фотостены 282 файла / 438 МБ»). Правило проверки
-- из pool #262: считать «проверено» только после позитивного контроля —
-- скан обязан показать НЕ-сироту, найденную по ссылке (иначе пустой вывод
-- ничего не значит).
--
-- Эталон ссылок — БД. Файлы на S3 в счёт не идут: удаление медиа идёт
-- через Payload, он же сносит объект.
--
-- Охват: (1) relation-колонки *_id, указывающие на media; (2) join-таблицы
-- many-to-many (Payload 3 хранит hasMany-связи в отдельных таблицах);
-- (3) jsonb-колонки — lexical-embed'ы вида {"relationTo":"media","value":<id>}.
\set ON_ERROR_STOP on
\pset pager off

CREATE TEMP TABLE ref_media (media_id bigint PRIMARY KEY);

-- (1) Прямые relation-колонки: любая колонка *_id, значение которой совпадает
--     с существующим media.id. Так не пропустим поле, переименованное в коде.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('integer', 'bigint')
      AND c.column_name LIKE '%\_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'media'
      -- Внутренние таблицы Payload исключены СОЗНАТЕЛЬНО: `_media_v.parent_id`
      -- = id самой media → каждая строка «ссылается на себя», и скан назвал бы
      -- связанными все 640 файлов (ровно то, что случилось в прогоне 15.09).
      AND c.table_name NOT LIKE '\_%'
      AND c.table_name NOT LIKE '%\_locales'
      AND c.table_name NOT LIKE '%\_rels'
      AND c.table_name NOT LIKE 'payload\_%'
      AND c.column_name <> '_parent_id'
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO ref_media (media_id)
         SELECT DISTINCT (%1$I."%2$I")::bigint
         FROM public.%1$I "%1$I"
         WHERE "%2$I" IS NOT NULL
           AND EXISTS (SELECT 1 FROM media m WHERE m.id = "%1$I"."%2$I")
         ON CONFLICT (media_id) DO NOTHING',
        r.table_name, r.column_name
      );
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'пропущено %.%: %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- (2) Join-таблицы many-to-many: строки, где ЛЮБАЯ целочисленная колонка
--     совпадает с media.id (Payload 3: gallery/images/связи-«массивы»).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('integer', 'bigint')
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'media'
      AND c.table_name NOT LIKE '\_%'
      AND c.table_name NOT LIKE '%\_locales'
      AND c.table_name NOT LIKE '%\_rels'
      AND c.table_name NOT LIKE 'payload\_%'
      AND c.column_name <> '_parent_id'
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO ref_media (media_id)
         SELECT DISTINCT ("%1$I"."%2$I")::bigint
         FROM public."%1$I" "%1$I"
         WHERE "%1$I"."%2$I" IS NOT NULL
           AND EXISTS (SELECT 1 FROM media m WHERE m.id = "%1$I"."%2$I")
         ON CONFLICT (media_id) DO NOTHING',
        r.table_name, r.column_name
      );
    EXCEPTION WHEN others THEN
      NULL; -- нечисловая/иная колонка — просто пропуск
    END;
  END LOOP;
END $$;

-- (3) jsonb: lexical-embed'ы. Значение может быть числом или строкой.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.data_type = 'jsonb'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE '\_%'
      AND c.table_name NOT LIKE '%\_locales'
      AND c.table_name NOT LIKE '%\_rels'
      AND c.table_name NOT LIKE 'payload\_%'
      AND c.column_name <> '_parent_id'
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO ref_media (media_id)
         SELECT DISTINCT v::bigint
         FROM public."%1$I" "%1$I",
              LATERAL jsonb_path_query(
                "%1$I"."%2$I",
                ''$[*]?(@.relationTo == "media").value''
              ) AS q(v)
         WHERE q.v IS NOT NULL
           AND jsonb_typeof(q.v) = ''number''
           AND q.v::text ~ ''^[0-9]+$''
         ON CONFLICT (media_id) DO NOTHING',
        r.table_name, r.column_name
      );
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'jsonb пропущен %.%: %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
END $$;

\echo '=== СВЯЗАННЫЕ media (позитивный контроль: не ноль) ==='
SELECT count(*) AS referenced FROM ref_media;

\echo '=== СИРОТЫ: media, на которую нет ссылок нигде ==='
SELECT
  m.id,
  m.filename,
  pg_size_pretty(COALESCE(m.filesize, 0)::bigint) AS size,
  m.created_at
FROM media m
LEFT JOIN ref_media r ON r.media_id = m.id
WHERE r.media_id IS NULL
ORDER BY m.filesize DESC NULLS LAST;

\echo '=== КОНТРОЛЬ: media, НЕ найденная ни в одной *_id-колонке ==='
SELECT count(*) AS not_referenced_by_columns
FROM media m LEFT JOIN ref_media r ON r.media_id = m.id
WHERE r.media_id IS NULL;

\echo '=== ИТОГО ==='
SELECT
  count(*) FILTER (WHERE r.media_id IS NULL) AS orphans,
  pg_size_pretty(COALESCE(sum(m.filesize) FILTER (WHERE r.media_id IS NULL), 0)::bigint) AS orphans_size,
  count(*) AS media_total
FROM media m
LEFT JOIN ref_media r ON r.media_id = m.id;

-- ============================================================================
-- Разбор «282 сироты» из probe-prod: media с префиксом fotostena-, которых нет
-- в vk_candidates. Вопрос не «есть ли они», а ОТКУДА они всё же используются.
-- Ответ — поимённая сверка с каждой relation-таблицей: если файл найден хотя бы
-- в одной, удалять его нельзя (страница сайта на него ссылается).
-- ============================================================================
\echo '=== fotostena- БЕЗ vk_candidates: откуда всё же используются ==='

CREATE TEMP TABLE fotostena_orphans AS
SELECT m.id, m.filename, m.filesize
FROM media m
WHERE m.filename LIKE 'fotostena-%'
  AND NOT EXISTS (SELECT 1 FROM vk_candidates c WHERE c.media_id = m.id);

\echo '--- сколько таких всего ---'
SELECT count(*) AS fotostena_without_candidate,
       pg_size_pretty(COALESCE(sum(filesize), 0)::bigint) AS size
FROM fotostena_orphans;

\echo '--- сверка по relation-колонкам (поимённо, не по префиксу) ---'
DO $$
DECLARE r record; hit bigint; total bigint; grp text := '';
BEGIN
  SELECT count(*) INTO total FROM fotostena_orphans;
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('integer', 'bigint')
      AND c.column_name LIKE '%\_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'media'
      AND c.table_name NOT LIKE '\_%'
      AND c.table_name NOT LIKE '%\_locales'
      AND c.table_name NOT LIKE '%\_rels'
      AND c.table_name NOT LIKE 'payload\_%'
      AND c.column_name <> '_parent_id'
    ORDER BY c.table_name, c.column_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM fotostena_orphans o
       WHERE EXISTS (
         SELECT 1 FROM public."%1$I" t
         WHERE t."%2$I" = o.id
       )',
      r.table_name, r.column_name
    ) INTO hit;
    IF hit > 0 THEN
      grp := grp || format(E'\n  %I.%I: %s файлов', r.table_name, r.column_name, hit);
    END IF;
  END LOOP;
  RAISE NOTICE 'ВСЕГО fotostena- без кандидата: %', total;
  IF grp = '' THEN
    RAISE NOTICE 'ИСПОЛЬЗУЕТСЯ: НИ ОДНОЙ таблицей — все кандидаты на удаление';
  ELSE
    RAISE NOTICE 'ИСПОЛЬЗУЕТСЯ:%', grp;
  END IF;
END $$;

\echo '--- поимённо: 20 файлов из отчёта, ссылки по колонкам (динамический обход) ---'
DO $$
DECLARE r record; src record; hit bigint;
BEGIN
  FOR r IN
    SELECT o.id, o.filename, o.filesize
    FROM fotostena_orphans o
    ORDER BY o.filesize DESC NULLS LAST
    LIMIT 20
  LOOP
    RAISE NOTICE 'файл #% (%) — источники:', r.id, r.filename;
    FOR src IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public'
        AND c.data_type IN ('integer', 'bigint')
        AND c.column_name LIKE '%\_id'
        AND t.table_type = 'BASE TABLE'
        AND c.table_name <> 'media'
        AND c.table_name NOT LIKE '\_%'
        AND c.table_name NOT LIKE 'payload_preferences%'
    LOOP
      EXECUTE format(
        'SELECT count(*) FROM public."%1$I" t WHERE t."%2$I" = $1',
        src.table_name, src.column_name
      ) INTO hit USING r.id;
      IF hit > 0 THEN
        RAISE NOTICE '%', format('    %I.%I', src.table_name, src.column_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;

\echo '=== ИТОГ: из fotostena-без-кандидата удаляемые ==='
SELECT count(*) AS truly_unreferenced
FROM fotostena_orphans o
LEFT JOIN ref_media r ON r.media_id = o.id
WHERE r.media_id IS NULL;
