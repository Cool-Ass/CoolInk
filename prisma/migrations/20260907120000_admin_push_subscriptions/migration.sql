CREATE TABLE "AdminPushSubscription" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPushSubscription_endpoint_key" ON "AdminPushSubscription"("endpoint");
CREATE INDEX "AdminPushSubscription_adminUserId_updatedAt_idx" ON "AdminPushSubscription"("adminUserId", "updatedAt");

ALTER TABLE "AdminPushSubscription"
  ADD CONSTRAINT "AdminPushSubscription_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminPushSubscription" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminPushSubscription" FROM PUBLIC, anon, authenticated;

-- The contact section now contains the public calendar. Remove the old,
-- duplicate standalone calendar only from the homepage snapshots that also
-- contain a contact section.
UPDATE "Page"
SET "modules" = (
  SELECT COALESCE(jsonb_agg(item ORDER BY position), '[]'::jsonb)::text
  FROM jsonb_array_elements("Page"."modules"::jsonb) WITH ORDINALITY AS entry(item, position)
  WHERE item->>'type' <> 'booking'
)
WHERE "isHomepage" = TRUE
  AND "modules"::jsonb @> '[{"type":"contact"}]'::jsonb
  AND "modules"::jsonb @> '[{"type":"booking"}]'::jsonb;

UPDATE "Page"
SET "publishedModules" = (
  SELECT COALESCE(jsonb_agg(item ORDER BY position), '[]'::jsonb)::text
  FROM jsonb_array_elements("Page"."publishedModules"::jsonb) WITH ORDINALITY AS entry(item, position)
  WHERE item->>'type' <> 'booking'
)
WHERE "isHomepage" = TRUE
  AND "publishedModules" IS NOT NULL
  AND "publishedModules"::jsonb @> '[{"type":"contact"}]'::jsonb
  AND "publishedModules"::jsonb @> '[{"type":"booking"}]'::jsonb;
