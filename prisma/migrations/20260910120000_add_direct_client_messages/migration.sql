CREATE TABLE IF NOT EXISTS "DirectMessage" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_createdAt_idx" ON "DirectMessage"("clientId", "createdAt");
CREATE INDEX IF NOT EXISTS "DirectMessage_clientId_author_readAt_idx" ON "DirectMessage"("clientId", "author", "readAt");

DO $$ BEGIN
  ALTER TABLE "DirectMessage"
    ADD CONSTRAINT "DirectMessage_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
