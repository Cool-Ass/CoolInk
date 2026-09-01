-- Google Calendar integration metadata only. Existing appointments and
-- calendar events are untouched; no business data is deleted or rewritten.
CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "accountEmail" TEXT,
  "encryptedRefreshToken" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3),
  "primaryCalendarId" TEXT,
  "syncToken" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleCalendarConnection_adminUserId_key" ON "GoogleCalendarConnection"("adminUserId");

CREATE TABLE "GoogleCalendarSelection" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "summary" TEXT,
  "role" TEXT NOT NULL DEFAULT 'busy',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarSelection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleCalendarSelection_connectionId_calendarId_key" ON "GoogleCalendarSelection"("connectionId", "calendarId");
CREATE INDEX "GoogleCalendarSelection_connectionId_role_idx" ON "GoogleCalendarSelection"("connectionId", "role");

CREATE TABLE "GoogleCalendarEventSync" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "googleCalendarId" TEXT NOT NULL,
  "googleEventId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "calendarEventId" TEXT,
  "googleUpdatedAt" TIMESTAMP(3),
  "localFingerprint" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
  "syncError" TEXT,
  "remoteDeletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarEventSync_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleCalendarEventSync_appointmentId_key" ON "GoogleCalendarEventSync"("appointmentId");
CREATE UNIQUE INDEX "GoogleCalendarEventSync_calendarEventId_key" ON "GoogleCalendarEventSync"("calendarEventId");
CREATE UNIQUE INDEX "GoogleCalendarEventSync_googleCalendarId_googleEventId_key" ON "GoogleCalendarEventSync"("googleCalendarId", "googleEventId");
CREATE INDEX "GoogleCalendarEventSync_connectionId_syncStatus_idx" ON "GoogleCalendarEventSync"("connectionId", "syncStatus");

ALTER TABLE "GoogleCalendarConnection" ADD CONSTRAINT "GoogleCalendarConnection_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarSelection" ADD CONSTRAINT "GoogleCalendarSelection_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEventSync" ADD CONSTRAINT "GoogleCalendarEventSync_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEventSync" ADD CONSTRAINT "GoogleCalendarEventSync_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEventSync" ADD CONSTRAINT "GoogleCalendarEventSync_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoogleCalendarConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleCalendarSelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleCalendarEventSync" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "GoogleCalendarConnection", "GoogleCalendarSelection", "GoogleCalendarEventSync" FROM PUBLIC, anon, authenticated;
