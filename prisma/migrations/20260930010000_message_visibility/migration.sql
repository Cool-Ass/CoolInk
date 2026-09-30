-- Visibility is per authenticated recipient. Original content/media remain intact.
ALTER TABLE "ProjectMessage" ADD COLUMN "hiddenFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DirectMessage" ADD COLUMN "hiddenFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
