ALTER TABLE "StudioDocument" ADD COLUMN "formFields" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "StudioDocumentVersion" ADD COLUMN "formFields" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "DocumentAcceptance" ADD COLUMN "answers" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "DirectMessage" ADD COLUMN "imageUrl" TEXT;
