CREATE UNIQUE INDEX "DocumentAcceptance_id_clientId_key" ON "DocumentAcceptance"("id","clientId");
CREATE TABLE "SessionDocumentSignature" (
 "id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "acceptanceId" TEXT NOT NULL,
 "appointmentId" TEXT, "signature" TEXT NOT NULL, "snapshot" TEXT NOT NULL,
 "digest" TEXT NOT NULL, "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SessionDocumentSignature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionDocumentSignature_acceptanceId_appointmentId_key" ON "SessionDocumentSignature"("acceptanceId","appointmentId");
CREATE INDEX "SessionDocumentSignature_clientId_acceptedAt_idx" ON "SessionDocumentSignature"("clientId","acceptedAt");
ALTER TABLE "SessionDocumentSignature" ADD CONSTRAINT "SessionDocumentSignature_acceptanceId_clientId_fkey"
 FOREIGN KEY ("acceptanceId","clientId") REFERENCES "DocumentAcceptance"("id","clientId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionDocumentSignature" ADD CONSTRAINT "SessionDocumentSignature_appointmentId_fkey"
 FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
