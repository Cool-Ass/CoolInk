ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_flash_values_check" CHECK (
 "flashDurationMinutes" BETWEEN 30 AND 720 AND "flashDurationMinutes" % 30 = 0
 AND ("flashPrice" IS NULL OR "flashPrice" BETWEEN 1 AND 10000000)
 AND ("flashDepositAmount" IS NULL OR ("flashDepositAmount" BETWEEN 1 AND 10000000
 AND ("flashPrice" IS NULL OR "flashDepositAmount" <= "flashPrice")))
);
