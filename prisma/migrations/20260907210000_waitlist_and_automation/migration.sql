-- Clients can opt into a project-specific cancellation waitlist.
CREATE TABLE "WaitlistEntry" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "durationMinutes" INTEGER NOT NULL DEFAULT 120,
  "preferredWeekdays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
  "timePreference" TEXT NOT NULL DEFAULT 'any',
  "earliestDate" TIMESTAMP(3),
  "latestDate" TIMESTAMP(3),
  "notes" TEXT,
  "offeredAppointmentId" TEXT,
  "offeredAt" TIMESTAMP(3),
  "offerExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistEntry_projectId_key" ON "WaitlistEntry"("projectId");
CREATE UNIQUE INDEX "WaitlistEntry_offeredAppointmentId_key" ON "WaitlistEntry"("offeredAppointmentId");
CREATE INDEX "WaitlistEntry_status_createdAt_idx" ON "WaitlistEntry"("status", "createdAt");
CREATE INDEX "WaitlistEntry_clientId_status_idx" ON "WaitlistEntry"("clientId", "status");
CREATE INDEX "WaitlistEntry_offerExpiresAt_idx" ON "WaitlistEntry"("offerExpiresAt");

ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry"
  ADD CONSTRAINT "WaitlistEntry_offeredAppointmentId_fkey"
  FOREIGN KEY ("offeredAppointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Browser-facing Supabase roles never access operational tables directly.
ALTER TABLE "WaitlistEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "WaitlistEntry" FROM PUBLIC, anon, authenticated;
