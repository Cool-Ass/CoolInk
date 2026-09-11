CREATE TABLE "PageRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "modules" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PageRevision_pageId_version_key" ON "PageRevision"("pageId", "version");
CREATE INDEX "PageRevision_pageId_createdAt_idx" ON "PageRevision"("pageId", "createdAt");

ALTER TABLE "PageRevision"
ADD CONSTRAINT "PageRevision_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "Page"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageRevision" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PageRevision" FROM anon, authenticated;
