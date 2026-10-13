ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_campaign_check" CHECK (
 "campaignStatus" IS NULL OR COALESCE((
  "campaignStatus" IN ('draft', 'approved', 'rejected')
  AND "campaignAudience" IN ('no_visits', 'first_visit', 'returning', 'dormant')
  AND "suggestedDiscountPercent" BETWEEN 0 AND 30
  AND ("campaignStatus" = 'approved' OR (NOT active AND NOT "isPublic"))
 ), false)
);
