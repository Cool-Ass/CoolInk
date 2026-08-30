-- Private client/admin conversations are scoped to a tattoo project.
-- Existing projects and inspirations remain unchanged.
CREATE TABLE "ProjectMessage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "attachmentId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMessage_attachmentId_key" ON "ProjectMessage"("attachmentId");
CREATE INDEX "ProjectMessage_projectId_createdAt_idx" ON "ProjectMessage"("projectId", "createdAt");
CREATE INDEX "ProjectMessage_projectId_author_readAt_idx" ON "ProjectMessage"("projectId", "author", "readAt");

ALTER TABLE "ProjectMessage"
  ADD CONSTRAINT "ProjectMessage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMessage"
  ADD CONSTRAINT "ProjectMessage_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "ProjectImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectMessage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "ProjectMessage" FROM PUBLIC, anon, authenticated;
