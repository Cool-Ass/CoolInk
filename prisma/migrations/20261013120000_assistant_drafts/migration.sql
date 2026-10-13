CREATE TABLE "AssistantDraft" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "projectId" TEXT NOT NULL,
 "clientId" TEXT NOT NULL,
 "adminUserId" TEXT NOT NULL,
 "body" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AssistantDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AssistantDraft_adminUserId_createdAt_idx" ON "AssistantDraft"("adminUserId", "createdAt");
CREATE INDEX "AssistantDraft_clientId_idx" ON "AssistantDraft"("clientId");
