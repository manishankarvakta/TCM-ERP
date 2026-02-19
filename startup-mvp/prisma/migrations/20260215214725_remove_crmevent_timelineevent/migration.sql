/*
  Warnings:

  - You are about to drop the `CrmEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimelineEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CrmEvent" DROP CONSTRAINT "CrmEvent_ownerId_fkey";

-- DropTable
DROP TABLE "CrmEvent";

-- DropTable
DROP TABLE "TimelineEvent";
