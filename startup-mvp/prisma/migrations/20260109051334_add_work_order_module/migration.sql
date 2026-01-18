-- CreateEnum (WorkOrderStatus)
DO $$ BEGIN
    CREATE TYPE "WorkOrderStatus" AS ENUM ('PROGRESS', 'COMPLETE', 'CANCELED', 'HOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum (add REVIEW to QuotationStatus)
DO $$ BEGIN
    ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable (add expiredDate to Quotation if not exists)
DO $$ BEGIN
    ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "expiredDate" TIMESTAMP(3);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- CreateTable (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "WorkOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "advance" DECIMAL(12,2),
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PROGRESS',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_code_key" ON "WorkOrder"("code");
CREATE INDEX IF NOT EXISTS "WorkOrder_quotationId_idx" ON "WorkOrder"("quotationId");
CREATE INDEX IF NOT EXISTS "WorkOrder_createdById_idx" ON "WorkOrder"("createdById");
CREATE INDEX IF NOT EXISTS "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_quotationId_fkey'
    ) THEN
        ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WorkOrder_createdById_fkey'
    ) THEN
        ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
