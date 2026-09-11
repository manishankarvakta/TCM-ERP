-- Ensure CostCategory & ProfitabilityStatus enums exist if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CostCategory') THEN
    CREATE TYPE "CostCategory" AS ENUM ('LABOR', 'PROCUREMENT', 'DIRECT_EXPENSE', 'SUBCONTRACTOR', 'OVERHEAD', 'INDIRECT', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProfitabilityStatus') THEN
    CREATE TYPE "ProfitabilityStatus" AS ENUM ('HEALTHY', 'AT_RISK', 'CRITICAL', 'LOSS_MAKING', 'NOT_ENOUGH_DATA');
  END IF;
END $$;


-- Ensure TimesheetStatus & AllocationStatus enums exist if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TimesheetStatus') THEN
    CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AllocationStatus') THEN
    CREATE TYPE "AllocationStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'RELEASED', 'CANCELLED');
  END IF;
END $$;

-- Ensure relational table columns exist across schema generations
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectManagerId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "health" TEXT NOT NULL DEFAULT 'ON_TRACK';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "resourcePlanningReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "resourcePlanningReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "readyForQAAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "readyForClientReviewAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentExecutionReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentExecutionReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeExecutionReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeExecutionReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeWorkRequirement" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeCompletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeCompletedById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "marketingExecutionReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "marketingExecutionReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "marketingWorkRequirement" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "marketingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "marketingCompletedById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "developmentExecutionReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "developmentExecutionReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "developmentWorkRequirement" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "developmentCompletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "developmentCompletedById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qaExecutionReadyAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qaExecutionReadyById" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qaWorkRequirement" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qaCompletedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qaCompletedById" TEXT;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salary" DECIMAL(12, 2);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "department" TEXT;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "PurchaseItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "ChartOfAccount" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Voucher" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "JournalEntryLine" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "JournalEntryLine" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Ensure Timesheet columns exist if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Timesheet') THEN
    ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "issueId" TEXT;
    ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "taskId" TEXT;
    ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectCostAllocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "allocationMethod" TEXT NOT NULL DEFAULT 'DIRECT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectProfitabilitySnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contractValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "billableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "invoicedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "recognizedRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "collectedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "actualLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "actualDirectCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalActualCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "committedCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "projectedRemainingCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "projectedFinalCost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grossProfit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "projectedProfit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "grossMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "projectedMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "ProfitabilityStatus" NOT NULL DEFAULT 'NOT_ENOUGH_DATA',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectProfitabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "ProjectCostAllocation_organizationId_idx" ON "ProjectCostAllocation"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectCostAllocation_projectId_idx" ON "ProjectCostAllocation"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectCostAllocation_category_idx" ON "ProjectCostAllocation"("category");
CREATE INDEX IF NOT EXISTS "ProjectCostAllocation_sourceType_sourceId_idx" ON "ProjectCostAllocation"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "ProjectProfitabilitySnapshot_organizationId_idx" ON "ProjectProfitabilitySnapshot"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectProfitabilitySnapshot_projectId_idx" ON "ProjectProfitabilitySnapshot"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectProfitabilitySnapshot_calculatedAt_idx" ON "ProjectProfitabilitySnapshot"("calculatedAt");
CREATE INDEX IF NOT EXISTS "ProjectProfitabilitySnapshot_status_idx" ON "ProjectProfitabilitySnapshot"("status");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCostAllocation_organizationId_fkey') THEN
    ALTER TABLE "ProjectCostAllocation" ADD CONSTRAINT "ProjectCostAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCostAllocation_projectId_fkey') THEN
    ALTER TABLE "ProjectCostAllocation" ADD CONSTRAINT "ProjectCostAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCostAllocation_createdById_fkey') THEN
    ALTER TABLE "ProjectCostAllocation" ADD CONSTRAINT "ProjectCostAllocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectProfitabilitySnapshot_organizationId_fkey') THEN
    ALTER TABLE "ProjectProfitabilitySnapshot" ADD CONSTRAINT "ProjectProfitabilitySnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectProfitabilitySnapshot_projectId_fkey') THEN
    ALTER TABLE "ProjectProfitabilitySnapshot" ADD CONSTRAINT "ProjectProfitabilitySnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectProfitabilitySnapshot_createdById_fkey') THEN
    ALTER TABLE "ProjectProfitabilitySnapshot" ADD CONSTRAINT "ProjectProfitabilitySnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

