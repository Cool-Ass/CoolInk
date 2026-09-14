CREATE TABLE "StudioDocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioDocumentVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StudioDocument" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "StudioDocumentVersion_documentId_version_key" ON "StudioDocumentVersion"("documentId", "version");
CREATE INDEX "StudioDocumentVersion_createdAt_idx" ON "StudioDocumentVersion"("createdAt");
ALTER TABLE "StudioDocumentVersion" ADD CONSTRAINT "StudioDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StudioDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioDocumentVersion" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "StudioDocumentVersion" FROM PUBLIC, anon, authenticated;

INSERT INTO "StudioDocumentVersion" ("id", "documentId", "version", "title", "content", "category", "createdAt")
SELECT 'sdv_' || md5("id" || ':' || "version"::text), "id", "version", "title", "content", "category", "updatedAt"
FROM "StudioDocument"
ON CONFLICT ("documentId", "version") DO NOTHING;
