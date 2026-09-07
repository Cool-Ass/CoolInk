-- Distinguish consultations from tattoo projects without splitting the client history.
ALTER TABLE "TattooProject"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'tattoo',
  ADD COLUMN "consultationMode" TEXT,
  ADD COLUMN "nextAction" TEXT,
  ADD COLUMN "nextActionDueAt" TIMESTAMP(3);

CREATE INDEX "TattooProject_kind_status_updatedAt_idx"
  ON "TattooProject"("kind", "status", "updatedAt");
CREATE INDEX "TattooProject_nextActionDueAt_idx"
  ON "TattooProject"("nextActionDueAt");

-- Security-sensitive administrator changes get a permanent, append-only trail.
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "summary" TEXT NOT NULL,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx"
  ON "AdminAuditLog"("adminUserId", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx"
  ON "AdminAuditLog"("targetType", "targetId", "createdAt");
ALTER TABLE "AdminAuditLog"
  ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
