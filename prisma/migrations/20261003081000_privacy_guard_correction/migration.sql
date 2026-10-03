BEGIN;
-- Server-only quarantine: serialize client writes with an approved erasure.
-- A transaction-local request ID is used only by the executor. No public role
-- receives SQL access or a new policy. Retained evidence is never cascaded.
CREATE OR REPLACE FUNCTION public.coolink_privacy_owner(table_name text, row_data jsonb)
RETURNS text LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE owner_id text;
BEGIN
  IF table_name = 'Client' THEN RETURN row_data->>'id'; END IF;
  IF table_name = 'SiteSetting' THEN
    IF left(row_data->>'key', 13) = 'google_retry:' THEN
      SELECT p."clientId" INTO owner_id FROM public."Appointment" a
        JOIN public."TattooProject" p ON p.id = a."projectId"
        WHERE a.id = substring(row_data->>'key' FROM 14);
    END IF;
    RETURN owner_id;
  END IF;
  IF row_data ? 'clientId' THEN RETURN row_data->>'clientId'; END IF;
  IF row_data ? 'projectId' THEN
    SELECT "clientId" INTO owner_id FROM public."TattooProject" WHERE id = row_data->>'projectId';
  ELSIF row_data ? 'appointmentId' THEN
    SELECT p."clientId" INTO owner_id FROM public."Appointment" a
      JOIN public."TattooProject" p ON p.id = a."projectId"
      WHERE a.id = row_data->>'appointmentId';
  END IF;
  RETURN owner_id;
END $$;
CREATE OR REPLACE FUNCTION public.coolink_privacy_write_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE owner_id text; request_id text;
BEGIN
  FOR owner_id IN SELECT DISTINCT value FROM unnest(ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN public.coolink_privacy_owner(TG_TABLE_NAME, to_jsonb(OLD)) END,
    CASE WHEN TG_OP <> 'DELETE' THEN public.coolink_privacy_owner(TG_TABLE_NAME, to_jsonb(NEW)) END
  ]) value WHERE value IS NOT NULL ORDER BY value LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('privacy:' || owner_id, 0));
    SELECT id INTO request_id FROM public."AccountDeletionRequest"
      WHERE "clientId" = owner_id AND status IN ('executing', 'execution_failed', 'completed', 'completed_retained', 'retention_review', 'awaiting_retention_execution', 'retention_retained');
    IF request_id IS NOT NULL AND current_setting('coolink.privacy_execution', true) IS DISTINCT FROM request_id THEN
      RAISE EXCEPTION 'Client privacy execution locks this record' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Client', 'AccountDeletionRequest', 'TattooProject',
    'Appointment', 'ProjectImage', 'ProjectMessage', 'ProjectActivity', 'DirectMessage',
    'DocumentAcceptance', 'LoyaltyEntry', 'ClientNotification', 'PushSubscription',
    'WaitlistEntry', 'ReminderDelivery', 'GoogleCalendarEventSync', 'SiteSetting']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS coolink_privacy_guard ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER coolink_privacy_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.coolink_privacy_write_guard()', table_name);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.coolink_privacy_owner(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.coolink_privacy_write_guard() FROM PUBLIC, anon, authenticated;

-- Existing JWTs can outlive an Auth deletion or ban. Deny direct Storage
-- access for quarantined, banned or deleted identities, independent of token expiry.
CREATE OR REPLACE FUNCTION public.coolink_storage_identity_active()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  ) AND NOT EXISTS (
    SELECT 1 FROM public."Client" c JOIN public."AccountDeletionRequest" r ON r."clientId" = c.id
    WHERE c."supabaseUserId" = auth.uid()::text
      AND r.status IN ('executing', 'execution_failed', 'completed', 'completed_retained', 'retention_review', 'awaiting_retention_execution', 'retention_retained')
  );
$$;
REVOKE ALL ON FUNCTION public.coolink_storage_identity_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coolink_storage_identity_active() TO authenticated;
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS coolink_privacy_storage_guard ON storage.objects';
    EXECUTE 'CREATE POLICY coolink_privacy_storage_guard ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
      USING (bucket_id <> ''project-inspirations'' OR public.coolink_storage_identity_active())
      WITH CHECK (bucket_id <> ''project-inspirations'' OR public.coolink_storage_identity_active())';
  END IF;
END $$;
COMMIT;
