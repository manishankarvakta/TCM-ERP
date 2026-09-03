-- =============================================================================
-- Phase 16C — Invoice Tenant Ownership Reconciliation & NOT-NULL Final Hardening
-- Forward-Only Strict Tenant Reconciliation Migration
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. Deterministic Backfill from Quotation via Order
-- -----------------------------------------------------------------------
UPDATE "Invoice" i
SET "organizationId" = q."organizationId"
FROM "Order" o
JOIN "Quotation" q ON o."quotationId" = q.id
WHERE i."orderId" = o.id
  AND (i."organizationId" IS NULL OR i."organizationId" = '');

-- -----------------------------------------------------------------------
-- 2. Deterministic Backfill from ProjectBillingMilestone via Invoice Link
-- -----------------------------------------------------------------------
UPDATE "Invoice" i
SET "organizationId" = m."organizationId"
FROM "BillingMilestoneInvoiceLink" l
JOIN "ProjectBillingMilestone" m ON l."billingMilestoneId" = m.id
WHERE l."invoiceId" = i.id
  AND (i."organizationId" IS NULL OR i."organizationId" = '');

-- -----------------------------------------------------------------------
-- 3. Strict Precondition Assertion: Fail Safe if Unresolved Invoices Exist
-- -----------------------------------------------------------------------
DO $$
DECLARE
  unresolved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM "Invoice"
  WHERE "organizationId" IS NULL OR "organizationId" = '';

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'Phase 16C Migration Aborted: % Invoice record(s) have unresolvable tenant ownership. Arbitrary tenant fallback is strictly forbidden.', unresolved_count;
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- 4. Foreign Key Constraint (Idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------
-- 5. Enforce Database NOT NULL Invariant
-- -----------------------------------------------------------------------
ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;

-- -----------------------------------------------------------------------
-- 6. Create Index if Not Exists
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
