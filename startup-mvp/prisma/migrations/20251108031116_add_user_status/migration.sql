-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
