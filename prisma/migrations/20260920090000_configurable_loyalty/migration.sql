-- Preserve every historical settlement and permit validated configurable future rewards.
ALTER TABLE "LoyaltyEntry" DROP CONSTRAINT "LoyaltyEntry_amounts_check";
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_amounts_check" CHECK (
  "grossCents" >= 0 AND "discountCents" BETWEEN 0 AND "grossCents"
  AND "paidCents" = "grossCents" - "discountCents"
);
ALTER TABLE "LoyaltyEntry" DROP CONSTRAINT "LoyaltyEntry_stamps_check";
ALTER TABLE "LoyaltyEntry" ADD CONSTRAINT "LoyaltyEntry_stamps_check" CHECK ("stamps" BETWEEN -50 AND 50);
