CREATE TABLE "Voucher" (
 "id" TEXT PRIMARY KEY, "issueKey" TEXT NOT NULL UNIQUE, "code" TEXT NOT NULL, "recipientName" TEXT NOT NULL,
 "amountCents" INTEGER NOT NULL, "validUntil" TIMESTAMP(3) NOT NULL,
 "clientId" TEXT, "appointmentId" TEXT, "redeemedAt" TIMESTAMP(3),
 "appliedCents" INTEGER NOT NULL DEFAULT 0, "cancelledAt" TIMESTAMP(3),
 "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Voucher_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "Voucher_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");
CREATE UNIQUE INDEX "Voucher_appointmentId_key" ON "Voucher"("appointmentId");
CREATE INDEX "Voucher_clientId_idx" ON "Voucher"("clientId");
ALTER TABLE "Appointment" ADD COLUMN "voucherRequested" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "loyaltyReserved" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "loyaltyReservation" TEXT;
ALTER TABLE "LoyaltyEntry" ADD COLUMN "voucherCents" INTEGER NOT NULL DEFAULT 0;
