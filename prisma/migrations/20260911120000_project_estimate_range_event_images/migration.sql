ALTER TABLE "TattooProject"
  ADD COLUMN "estimatedPriceMax" INTEGER;

ALTER TABLE "CalendarEvent"
  ADD COLUMN "imageUrls" TEXT NOT NULL DEFAULT '[]';
