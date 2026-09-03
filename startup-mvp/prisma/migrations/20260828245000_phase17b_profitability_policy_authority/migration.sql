-- Phase 17B: Labor Cost Basis & Profitability Policy Authority Final Closure

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "laborCostingHoursPerMonth" DECIMAL(5,2) NOT NULL DEFAULT 160.00;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "healthyMarginThreshold" DOUBLE PRECISION NOT NULL DEFAULT 15.0;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "atRiskMarginThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable ProjectProfitabilitySnapshot
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "laborCostingHoursSnapshot" DECIMAL(5,2);
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "healthyMarginThresholdSnapshot" DOUBLE PRECISION;
ALTER TABLE "ProjectProfitabilitySnapshot" ADD COLUMN IF NOT EXISTS "atRiskMarginThresholdSnapshot" DOUBLE PRECISION;
