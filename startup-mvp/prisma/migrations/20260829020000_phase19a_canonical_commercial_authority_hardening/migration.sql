-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN "baselineSourceType" TEXT DEFAULT 'PROJECT_BUDGET',
ADD COLUMN "baselineSourceId" TEXT;
