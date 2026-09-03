-- Phase 17A: Financial Authority, Cost Provenance & Profitability Formula Hardening

-- AlterTable ProjectProfitabilitySnapshot
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "isComplete" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "missingCostSourceCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "missingLaborCostCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "warnings" JSONB;
