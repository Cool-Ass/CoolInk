-- Parsing compatibility only. Never restore platform roles/grants into production.
DO $$
DECLARE role_name text;
BEGIN
  IF current_database() <> 'coolink_restore' THEN
    RAISE EXCEPTION 'Offline restore database required';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role',
    'supabase_auth_admin', 'supabase_storage_admin', 'supabase_admin', 'dashboard_user']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', role_name);
    END IF;
  END LOOP;
END $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
