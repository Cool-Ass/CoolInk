-- CoolInk never reads or writes application tables directly from the browser.
-- All traffic is mediated by authenticated Next.js routes and Prisma.  The
-- Data API roles therefore receive no table, view, sequence or RPC access.
-- Prisma connects as the database owner on the server, which bypasses RLS;
-- credentials for that role must remain server-only.

DO $$
DECLARE
  item record;
BEGIN
  -- Existing application tables.  `_prisma_migrations` is deliberately
  -- included in the REVOKE below but is not put under RLS, so Prisma can keep
  -- maintaining its migration history with its owner connection.
  FOR item IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.relname);
  END LOOP;
END $$;

-- Defence in depth: RLS is enabled and the two browser-facing database roles
-- receive no underlying object privileges.  This also protects tables which
-- do not have a policy yet and prevents accidental direct use of PostgREST.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Keep future Prisma migrations closed by default.  These defaults apply to
-- database objects subsequently created by the migration owner in `public`.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
