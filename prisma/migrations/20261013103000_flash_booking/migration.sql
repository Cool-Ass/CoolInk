-- Extend the existing portfolio and booking records, preserving historical data.
ALTER TABLE "PortfolioItem"
 ADD COLUMN "flashEnabled" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "flashUnique" BOOLEAN NOT NULL DEFAULT true,
 ADD COLUMN "flashSize" TEXT,
 ADD COLUMN "flashPrice" INTEGER,
 ADD COLUMN "flashDurationMinutes" INTEGER NOT NULL DEFAULT 120,
 ADD COLUMN "flashDepositAmount" INTEGER;
ALTER TABLE "TattooProject" ADD COLUMN "flashPortfolioId" TEXT;
CREATE INDEX "TattooProject_flashPortfolioId_idx" ON "TattooProject"("flashPortfolioId");
ALTER TABLE "TattooProject" ADD CONSTRAINT "TattooProject_flashPortfolioId_fkey"
 FOREIGN KEY ("flashPortfolioId") REFERENCES "PortfolioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
