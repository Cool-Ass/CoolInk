-- Additive: preserve project history while moving acquisition source to the client.
ALTER TABLE "Client" ADD COLUMN "leadSource" TEXT;
-- Earliest known acquisition wins, id makes equal timestamps deterministic.
UPDATE "Client" AS client
SET "leadSource" = source."leadSource"
FROM (
  SELECT DISTINCT ON ("clientId") "clientId", "leadSource"
  FROM "TattooProject"
  WHERE "leadSource" IN ('instagram', 'facebook', 'google', 'recommendation', 'returning', 'event', 'other')
  ORDER BY "clientId", "createdAt" ASC, "id" ASC
) AS source
WHERE client."id" = source."clientId" AND client."leadSource" IS NULL;
