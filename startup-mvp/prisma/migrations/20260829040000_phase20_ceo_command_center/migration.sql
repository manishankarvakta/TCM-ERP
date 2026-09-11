-- CreateTable
CREATE TABLE IF NOT EXISTS "CeoCommandCenterSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "arOverdueWarningDays" INTEGER NOT NULL DEFAULT 30,
    "approvalAgingThresholdHours" INTEGER NOT NULL DEFAULT 48,
    "projectMarginWarningPercent" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "projectOverdueWarningDays" INTEGER NOT NULL DEFAULT 7,
    "resourceUtilizationWarningPercent" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
    "slaCriticalityThresholdHours" INTEGER NOT NULL DEFAULT 24,
    "largeCrAmountThreshold" DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
    "cashWarningThreshold" DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CeoCommandCenterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CeoKpiSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "recognizedRevenue" DECIMAL(14,2) NOT NULL,
    "invoicedAmount" DECIMAL(14,2) NOT NULL,
    "collectedAmount" DECIMAL(14,2) NOT NULL,
    "accountsReceivable" DECIMAL(14,2) NOT NULL,
    "accountsPayable" DECIMAL(14,2) NOT NULL,
    "cashBankBalance" DECIMAL(14,2) NOT NULL,
    "activeProjectCount" INTEGER NOT NULL,
    "atRiskProjectCount" INTEGER NOT NULL,
    "criticalProjectCount" INTEGER NOT NULL,
    "pendingApprovalCount" INTEGER NOT NULL,
    "openSlaBreachCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeoKpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CeoExecutiveAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CeoExecutiveAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CeoCommandCenterSettings_organizationId_key" ON "CeoCommandCenterSettings"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoCommandCenterSettings_organizationId_idx" ON "CeoCommandCenterSettings"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoKpiSnapshot_organizationId_idx" ON "CeoKpiSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoKpiSnapshot_snapshotDate_idx" ON "CeoKpiSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CeoKpiSnapshot_organizationId_snapshotDate_key" ON "CeoKpiSnapshot"("organizationId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CeoExecutiveAlert_idempotencyKey_key" ON "CeoExecutiveAlert"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoExecutiveAlert_organizationId_idx" ON "CeoExecutiveAlert"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoExecutiveAlert_sourceType_sourceId_idx" ON "CeoExecutiveAlert"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoExecutiveAlert_severity_idx" ON "CeoExecutiveAlert"("severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CeoExecutiveAlert_resolved_idx" ON "CeoExecutiveAlert"("resolved");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CeoCommandCenterSettings_organizationId_fkey') THEN
    ALTER TABLE "CeoCommandCenterSettings" ADD CONSTRAINT "CeoCommandCenterSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CeoKpiSnapshot_organizationId_fkey') THEN
    ALTER TABLE "CeoKpiSnapshot" ADD CONSTRAINT "CeoKpiSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CeoExecutiveAlert_organizationId_fkey') THEN
    ALTER TABLE "CeoExecutiveAlert" ADD CONSTRAINT "CeoExecutiveAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

