-- CALENDAR HUB: this migration is reviewed and intended for the test
-- environment only until the Calendar Hub checkpoint is accepted.

CREATE TABLE "WorkingHoursOverride" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TEXT NOT NULL DEFAULT '10:00',
  "endsAt" TEXT NOT NULL DEFAULT '19:00',
  "breakStart" TEXT,
  "breakEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkingHoursOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkingHoursOverride_date_key" ON "WorkingHoursOverride"("date");
ALTER TABLE "WorkingHoursOverride" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "WorkingHoursOverride" FROM PUBLIC, anon, authenticated;

ALTER TABLE "Promotion"
  ADD COLUMN "color" TEXT NOT NULL DEFAULT '#C99A4A',
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "promoCode" TEXT,
  ADD COLUMN "ctaLabel" TEXT,
  ADD COLUMN "ctaUrl" TEXT,
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;
REVOKE ALL PRIVILEGES ON TABLE "Promotion" FROM PUBLIC, anon, authenticated;

CREATE TABLE "AvailableSlot" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#10B981',
  "icon" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AvailableSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AvailableSlot_startsAt_endsAt_idx" ON "AvailableSlot"("startsAt", "endsAt");
CREATE INDEX "AvailableSlot_isPublic_startsAt_endsAt_idx" ON "AvailableSlot"("isPublic", "startsAt", "endsAt");
ALTER TABLE "AvailableSlot" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "AvailableSlot" FROM PUBLIC, anon, authenticated;

CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "color" TEXT NOT NULL DEFAULT '#6B7280',
  "icon" TEXT,
  "label" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalendarEvent_startsAt_endsAt_idx" ON "CalendarEvent"("startsAt", "endsAt");
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "CalendarEvent" FROM PUBLIC, anon, authenticated;
