ALTER TABLE "AssistantDraft" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AssistantDraft" FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.coolink_assistant_draft_owner() RETURNS trigger LANGUAGE plpgsql
 SET search_path = pg_catalog, public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public."TattooProject" WHERE id = NEW."projectId" AND "clientId" = NEW."clientId")
 OR length(NEW.body) NOT BETWEEN 1 AND 4000 THEN
  RAISE EXCEPTION 'Invalid draft owner or body' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coolink_assistant_draft_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER coolink_assistant_draft_owner BEFORE INSERT OR UPDATE ON "AssistantDraft"
 FOR EACH ROW EXECUTE FUNCTION public.coolink_assistant_draft_owner();
CREATE TRIGGER coolink_privacy_guard BEFORE INSERT OR UPDATE OR DELETE ON "AssistantDraft"
 FOR EACH ROW EXECUTE FUNCTION public.coolink_privacy_write_guard();
