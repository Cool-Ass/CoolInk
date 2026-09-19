CREATE TABLE "LoyaltyEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clientId" TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "appointmentId" TEXT REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "key" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "stamps" INTEGER NOT NULL,
  "grossCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "voidedBy" TEXT,
  CONSTRAINT "LoyaltyEntry_amounts_check" CHECK ("grossCents" >= 0 AND "discountCents" BETWEEN 0 AND 70000 AND "paidCents" = "grossCents" - "discountCents"),
  CONSTRAINT "LoyaltyEntry_stamps_check" CHECK ("stamps" BETWEEN -5 AND 5)
);
CREATE UNIQUE INDEX "LoyaltyEntry_appointmentId_key" ON "LoyaltyEntry"("appointmentId");
CREATE UNIQUE INDEX "LoyaltyEntry_key_key" ON "LoyaltyEntry"("key");
CREATE INDEX "LoyaltyEntry_clientId_createdAt_idx" ON "LoyaltyEntry"("clientId", "createdAt");
ALTER TABLE "LoyaltyEntry" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "LoyaltyEntry" FROM PUBLIC, anon, authenticated;
