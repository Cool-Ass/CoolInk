ALTER TABLE "TattooProject"
  ADD COLUMN "depositStatus" TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN "depositAmount" INTEGER,
  ADD COLUMN "depositPaidAt" TIMESTAMP(3),
  ADD COLUMN "depositPaymentMethod" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN "price" INTEGER;

CREATE TABLE "ProjectActivity" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectActivity_projectId_createdAt_idx" ON "ProjectActivity"("projectId", "createdAt");
ALTER TABLE "ProjectActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClientNotification" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "projectId" TEXT,
  "appointmentId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientNotification_clientId_readAt_createdAt_idx" ON "ClientNotification"("clientId", "readAt", "createdAt");
CREATE INDEX "ClientNotification_projectId_createdAt_idx" ON "ClientNotification"("projectId", "createdAt");
ALTER TABLE "ClientNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientNotification" ADD CONSTRAINT "ClientNotification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
