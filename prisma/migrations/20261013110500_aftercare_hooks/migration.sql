-- Start only future completion transitions, never mass-backfill historical visits.
CREATE OR REPLACE FUNCTION public.coolink_start_aftercare() RETURNS trigger LANGUAGE plpgsql
 SET search_path = pg_catalog, public AS $$
BEGIN
 IF NEW."status" = 'completed' AND OLD."status" IS DISTINCT FROM 'completed'
 AND NEW."aftercareStartedAt" IS NULL THEN
   NEW."aftercareStartedAt" := CURRENT_TIMESTAMP;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coolink_start_aftercare() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS coolink_start_aftercare ON "Appointment";
CREATE TRIGGER coolink_start_aftercare BEFORE UPDATE OF "status" ON "Appointment"
 FOR EACH ROW EXECUTE FUNCTION public.coolink_start_aftercare();
