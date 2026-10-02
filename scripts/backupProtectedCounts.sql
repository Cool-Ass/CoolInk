-- Counts only: never emit identities, password hashes or token records.
CREATE TEMP TABLE protected_counts (name text PRIMARY KEY, row_count bigint NOT NULL);
SELECT format(
  'INSERT INTO pg_temp.protected_counts SELECT %L, count(*) FROM %I.%I;',
  schemaname || '.' || tablename, schemaname, tablename
) FROM pg_catalog.pg_tables
WHERE schemaname IN ('auth', 'storage') ORDER BY schemaname, tablename
\gexec
SELECT name || '=' || row_count FROM protected_counts ORDER BY name;
