-- An appointment mutation and its export marker commit or roll back together.
-- Existing SiteSetting RLS/ACLs also protect this private operational queue.
CREATE OR REPLACE FUNCTION coolink_queue_google_export() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."startsAt" IS NOT DISTINCT FROM OLD."startsAt"
    AND NEW."endsAt" IS NOT DISTINCT FROM OLD."endsAt"
    AND NEW."status" IS NOT DISTINCT FROM OLD."status" THEN
    RETURN NEW;
  END IF;
  INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
    VALUES ('google_retry:' || NEW."id",
      jsonb_build_object('appointmentId', NEW."id", 'queuedAt', clock_timestamp(), 'nonce', gen_random_uuid())::text,
      clock_timestamp())
    ON CONFLICT ("key") DO UPDATE SET "value" = (EXCLUDED."value"::jsonb ||
      jsonb_strip_nulls(jsonb_build_object('lease', "SiteSetting"."value"::jsonb->'lease',
        'leaseUntil', "SiteSetting"."value"::jsonb->'leaseUntil')))::text,
      "updatedAt" = EXCLUDED."updatedAt";
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION coolink_queue_google_export() FROM PUBLIC;
CREATE TRIGGER coolink_appointment_export_outbox
AFTER INSERT OR UPDATE OF "startsAt", "endsAt", "status" ON "Appointment"
FOR EACH ROW EXECUTE FUNCTION coolink_queue_google_export();
