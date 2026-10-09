-- Additive: preserve project history while moving acquisition source to the client.
ALTER TABLE "Client" ADD COLUMN "leadSource" TEXT;
ALTER TABLE "Client" ADD COLUMN "registeredAt" TIMESTAMP(3);
CREATE INDEX "Client_registeredAt_idx" ON "Client"("registeredAt");

-- Use verified Auth creation dates, not editable contact messages or CRM dates.
UPDATE "Client" AS client
SET "registeredAt" = account.created_at AT TIME ZONE 'UTC'
FROM auth.users AS account
WHERE client."supabaseUserId" = account.id::text;

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
