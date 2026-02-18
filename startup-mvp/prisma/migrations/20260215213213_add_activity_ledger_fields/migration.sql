/*
  Warnings:

  - You are about to drop the column `entityId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Activity` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_activity_entity_created";

-- AlterTable: Add new columns first
ALTER TABLE "Activity" 
ADD COLUMN "contextId" TEXT,
ADD COLUMN "contextType" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "subjectType" TEXT;

-- Migrate existing data: Copy entityType/entityId to contextType/contextId
UPDATE "Activity" 
SET "contextType" = "entityType",
    "contextId" = "entityId"
WHERE "entityType" IS NOT NULL AND "entityId" IS NOT NULL;

-- Now safe to drop old columns
ALTER TABLE "Activity" 
DROP COLUMN "entityId",
DROP COLUMN "entityType";

-- CreateIndex
CREATE INDEX "idx_activity_context_timeline" ON "Activity"("contextType", "contextId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_subject_history" ON "Activity"("subjectType", "subjectId", "createdAt" DESC);
