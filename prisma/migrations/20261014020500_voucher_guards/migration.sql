ALTER TABLE "Voucher" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_loyalty_reservation_check" CHECK (NOT "loyaltyReserved" OR ("loyaltyRequested" AND "loyaltyReservation" IS NOT NULL));
REVOKE ALL ON "Voucher" FROM PUBLIC, anon, authenticated;
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_values_check" CHECK (
 "amountCents" BETWEEN 1 AND 100000000 AND "appliedCents" BETWEEN 0 AND "amountCents"
 AND (("redeemedAt" IS NULL AND "appliedCents" = 0) OR ("redeemedAt" IS NOT NULL AND "appointmentId" IS NOT NULL AND "clientId" IS NOT NULL AND "appliedCents" > 0))
);
-- Existing paid = gross - discount settlements remain valid with voucherCents = 0.
ALTER TABLE "LoyaltyEntry" DROP CONSTRAINT IF EXISTS "LoyaltyEntry_amounts_check";
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_amounts_check" CHECK ("grossCents" >= 0 AND "discountCents" BETWEEN 0 AND "grossCents" AND "paidCents" >= 0 AND "paidCents" = "grossCents" - "discountCents" - "voucherCents");
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_voucher_check" CHECK ("voucherCents" >= 0 AND "voucherCents" <= "grossCents" AND ("voucherCents" = 0 OR "discountCents" = 0));
CREATE TRIGGER coolink_privacy_guard BEFORE INSERT OR UPDATE OR DELETE ON "Voucher" FOR EACH ROW EXECUTE FUNCTION public.coolink_privacy_write_guard();
CREATE OR REPLACE FUNCTION public.coolink_voucher_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP <> 'INSERT' AND OLD."redeemedAt" IS NOT NULL AND
 (TG_OP = 'DELETE' OR to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) AND NOT EXISTS (SELECT 1 FROM public."AccountDeletionRequest" r WHERE r.id = current_setting('coolink.privacy_execution', true) AND r."clientId" = OLD."clientId" AND r.status IN ('executing', 'execution_failed', 'awaiting_retention_execution')) THEN
   RAISE EXCEPTION 'Redeemed voucher evidence is immutable' USING ERRCODE = '42501';
 END IF;
 IF TG_OP <> 'DELETE' AND NEW."appointmentId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public."Appointment" a JOIN public."TattooProject" p ON p.id = a."projectId"
  WHERE a.id = NEW."appointmentId" AND p."clientId" = NEW."clientId" AND p.kind = 'tattoo'
  AND (a."serviceType" IS NULL OR a."serviceType" = 'tattoo') AND NOT a."loyaltyReserved" AND a."startsAt" <= NEW."validUntil"
 ) THEN RAISE EXCEPTION 'Invalid voucher appointment' USING ERRCODE = '23514'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coolink_voucher_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER coolink_voucher_guard BEFORE INSERT OR UPDATE OR DELETE ON "Voucher" FOR EACH ROW EXECUTE FUNCTION public.coolink_voucher_guard();
CREATE OR REPLACE FUNCTION public.coolink_voucher_visit_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v public."Voucher"%ROWTYPE;
BEGIN
 SELECT * INTO v FROM public."Voucher" WHERE "appointmentId" = OLD.id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 IF v."redeemedAt" IS NOT NULL AND (
  NEW.status <> 'completed' OR NEW."startsAt" IS DISTINCT FROM OLD."startsAt" OR NEW.price IS DISTINCT FROM OLD.price
  OR NEW."serviceType" IS DISTINCT FROM OLD."serviceType" OR NEW."projectId" IS DISTINCT FROM OLD."projectId"
 ) THEN RAISE EXCEPTION 'Redeemed voucher visit history is immutable' USING ERRCODE = '42501'; END IF;
 IF NEW.status NOT IN ('cancelled', 'no_show') AND (
  NEW."startsAt" > v."validUntil" OR NEW."loyaltyReserved"
  OR (NEW."serviceType" IS NOT NULL AND NEW."serviceType" <> 'tattoo')
  OR NOT EXISTS (SELECT 1 FROM public."TattooProject" p WHERE p.id = NEW."projectId" AND p."clientId" = v."clientId" AND p.kind = 'tattoo')
 ) THEN RAISE EXCEPTION 'Visit violates voucher conditions' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coolink_voucher_visit_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER coolink_voucher_visit_guard BEFORE UPDATE OF "startsAt", price, "serviceType", status, "projectId", "loyaltyReserved" ON "Appointment" FOR EACH ROW EXECUTE FUNCTION public.coolink_voucher_visit_guard();
