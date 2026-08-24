CREATE TABLE "WorkingHours" (
  "id" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TEXT NOT NULL DEFAULT '10:00',
  "endsAt" TEXT NOT NULL DEFAULT '19:00',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkingHours_weekday_key" ON "WorkingHours"("weekday");
ALTER TABLE "WorkingHours" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "badge" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
