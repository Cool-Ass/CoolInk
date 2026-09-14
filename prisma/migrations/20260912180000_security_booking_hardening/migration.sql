ALTER TABLE "AdminUser"
  ADD COLUMN "mfaSecretEncrypted" TEXT,
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaRecoveryCodes" TEXT,
  ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Appointment"
  ADD COLUMN "serviceType" TEXT,
  ADD COLUMN "workstation" TEXT,
  ADD COLUMN "confirmationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "clientConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "reminderEscalatedAt" TIMESTAMP(3);

CREATE TABLE "WebhookReceipt" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "signatureDigest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookReceipt_provider_eventId_key" ON "WebhookReceipt"("provider", "eventId");
CREATE INDEX "WebhookReceipt_receivedAt_idx" ON "WebhookReceipt"("receivedAt");
ALTER TABLE "WebhookReceipt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "WebhookReceipt" FROM PUBLIC, anon, authenticated;
