-- =============================================================================
-- Phase 16B — Invoice Tenant Organization Reconciliation Migration
-- Forward-Only Idempotent Reconciliation Migration
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. Add organizationId column to Invoice table if missing
-- -----------------------------------------------------------------------
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- -----------------------------------------------------------------------
-- 2. Deterministic Backfill from Parent Quotation via Order
-- -----------------------------------------------------------------------
UPDATE "Invoice" i
SET "organizationId" = q."organizationId"
FROM "Order" o
JOIN "Quotation" q ON o."quotationId" = q.id
WHERE i."orderId" = o.id
  AND i."organizationId" IS NULL
  AND q."organizationId" IS NOT NULL;

-- -----------------------------------------------------------------------
-- 3. Fallback Backfill for any Unlinked Historical Invoices
-- -----------------------------------------------------------------------
UPDATE "Invoice"
SET "organizationId" = (SELECT id FROM "Organization" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "organizationId" IS NULL;

-- -----------------------------------------------------------------------
-- 4. Create Index if Not Exists
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- -----------------------------------------------------------------------
-- 5. Foreign Key Constraint (Idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
