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
