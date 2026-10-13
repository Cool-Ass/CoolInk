ALTER TABLE "Appointment" ADD COLUMN "aftercareStartedAt" TIMESTAMP(3),
 ADD COLUMN "aftercareConsultationRequestedAt" TIMESTAMP(3),
 ADD COLUMN "aftercareConsultationResolvedAt" TIMESTAMP(3);
ALTER TABLE "ProjectImage" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'inspiration',
 ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "ProjectImage" ADD CONSTRAINT "ProjectImage_appointmentId_fkey"
 FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ProjectImage_projectId_kind_appointmentId_idx" ON "ProjectImage"("projectId","kind","appointmentId");
