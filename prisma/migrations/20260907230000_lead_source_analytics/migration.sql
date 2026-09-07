-- Attribution stays on the project because one client may discover different
-- offers through different channels over time.
ALTER TABLE "TattooProject" ADD COLUMN "leadSource" TEXT;
CREATE INDEX "TattooProject_leadSource_createdAt_idx" ON "TattooProject"("leadSource", "createdAt");
