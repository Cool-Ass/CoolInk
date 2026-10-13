-- Additive only. Project deposits remain unchanged until a finance admin
-- explicitly assigns one to a visit. Never guess which session a payment covers.
ALTER TABLE "Appointment"
  ADD COLUMN "depositStatus" TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN "depositAmount" INTEGER,
  ADD COLUMN "depositPaidAt" TIMESTAMP(3),
  ADD COLUMN "depositPaymentMethod" TEXT;
ALTER TABLE "TattooProject" ADD COLUMN "depositAssignedAppointmentId" TEXT;
CREATE UNIQUE INDEX "TattooProject_depositAssignedAppointmentId_key" ON "TattooProject"("depositAssignedAppointmentId");
ALTER TABLE "TattooProject" ADD CONSTRAINT "TattooProject_depositAssignedAppointmentId_fkey"
  FOREIGN KEY ("depositAssignedAppointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
