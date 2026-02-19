/*
  Warnings:

  - You are about to drop the column `contactId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `issueId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `leadId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `opportunityId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_opportunityId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_ownerId_fkey";

-- DropIndex
DROP INDEX "Activity_contactId_idx";

-- DropIndex
DROP INDEX "Activity_leadId_idx";

-- DropIndex
DROP INDEX "Activity_opportunityId_idx";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "contactId",
DROP COLUMN "issueId",
DROP COLUMN "leadId",
DROP COLUMN "opportunityId",
DROP COLUMN "projectId",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT;

-- DropTable
DROP TABLE "Event";

-- CreateTable
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "attendees" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmEvent_entityType_entityId_idx" ON "CrmEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CrmEvent_ownerId_idx" ON "CrmEvent"("ownerId");

-- CreateIndex
CREATE INDEX "idx_crmevent_entity_created" ON "CrmEvent"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_entity_created" ON "Activity"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "idx_doc_entity_created" ON "Doc"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_note_entity_created" ON "Note"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_task_entity_created" ON "Task"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_timelineevent_entity_created" ON "TimelineEvent"("entityType", "entityId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CrmEvent" ADD CONSTRAINT "CrmEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
