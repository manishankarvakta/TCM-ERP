-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "salesAssistantId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sale_salesAssistantId_idx" ON "Sale"("salesAssistantId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sale_salesAssistantId_fkey') THEN
        ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salesAssistantId_fkey" FOREIGN KEY ("salesAssistantId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
