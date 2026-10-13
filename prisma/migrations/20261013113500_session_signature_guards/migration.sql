ALTER TABLE "SessionDocumentSignature" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SessionDocumentSignature" FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS coolink_privacy_guard ON "SessionDocumentSignature";
CREATE TRIGGER coolink_privacy_guard BEFORE INSERT OR UPDATE OR DELETE ON "SessionDocumentSignature"
 FOR EACH ROW EXECUTE FUNCTION public.coolink_privacy_write_guard();
CREATE OR REPLACE FUNCTION public.coolink_signature_immutable() RETURNS trigger LANGUAGE plpgsql
 SET search_path = pg_catalog, public AS $$
BEGIN
 -- A removed appointment may detach, but cannot rewrite signed evidence.
 IF (to_jsonb(NEW) - 'appointmentId') IS DISTINCT FROM (to_jsonb(OLD) - 'appointmentId')
 OR (NEW."appointmentId" IS DISTINCT FROM OLD."appointmentId" AND NEW."appointmentId" IS NOT NULL) THEN
  RAISE EXCEPTION 'Signed session evidence is immutable' USING ERRCODE = '42501';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coolink_signature_immutable() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS coolink_signature_immutable ON "SessionDocumentSignature";
CREATE TRIGGER coolink_signature_immutable BEFORE UPDATE ON "SessionDocumentSignature"
 FOR EACH ROW EXECUTE FUNCTION public.coolink_signature_immutable();
