ALTER TABLE "Client" ADD COLUMN "bookingDraft" JSONB;
ALTER TABLE "TattooProject" ADD COLUMN "estimatedSessionsMin" INTEGER,
  ADD COLUMN "estimatedSessionsMax" INTEGER, ADD COLUMN "sessionPriceCents" INTEGER;
ALTER TABLE "TattooProject" ADD CONSTRAINT "TattooProject_session_estimate_check" CHECK (
  ("estimatedSessionsMin" IS NULL OR "estimatedSessionsMin" BETWEEN 1 AND 100)
  AND ("estimatedSessionsMax" IS NULL OR "estimatedSessionsMax" BETWEEN 1 AND 100)
  AND ("estimatedSessionsMin" IS NULL OR "estimatedSessionsMax" IS NULL OR "estimatedSessionsMin" <= "estimatedSessionsMax")
  AND ("sessionPriceCents" IS NULL OR "sessionPriceCents" BETWEEN 1 AND 100000000)
);
ALTER TABLE "Appointment" ADD COLUMN "loyaltyRequested" BOOLEAN NOT NULL DEFAULT false;
