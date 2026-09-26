ALTER TABLE "TattooProject" ADD COLUMN "clientArchivedAt" TIMESTAMP(3);
CREATE INDEX "TattooProject_clientId_clientArchivedAt_idx" ON "TattooProject"("clientId", "clientArchivedAt");
