ALTER TABLE "Promotion" ADD COLUMN "campaignStatus" TEXT, ADD COLUMN "campaignAudience" TEXT,
 ADD COLUMN "campaignCaption" TEXT, ADD COLUMN "campaignStory" TEXT,
 ADD COLUMN "suggestedDiscountPercent" INTEGER, ADD COLUMN "campaignApprovedAt" TIMESTAMP(3),
 ADD COLUMN "campaignApprovedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "promotionId" TEXT;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
