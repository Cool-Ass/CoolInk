-- Fail closed when a valid credential points at a different/empty project.
DO $$
BEGIN
  IF to_regclass('public."Client"') IS NULL
     OR to_regclass('public."TattooProject"') IS NULL
     OR to_regclass('public."Appointment"') IS NULL THEN
    RAISE EXCEPTION 'Backup source is missing required CoolInk tables. Verify the production database connection.';
  END IF;
END
$$;

CREATE TEMP TABLE backup_table_counts (
  table_name text PRIMARY KEY,
  row_count bigint NOT NULL
);

SELECT format(
  'INSERT INTO pg_temp.backup_table_counts (table_name, row_count) SELECT %L, count(*) FROM public.%I;',
  tablename,
  tablename
)
FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

SELECT table_name || '=' || row_count
FROM pg_temp.backup_table_counts
ORDER BY table_name;
