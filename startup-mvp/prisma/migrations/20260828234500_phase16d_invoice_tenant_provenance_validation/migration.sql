-- =============================================================================
-- Phase 16D — Invoice Tenant Provenance Validation & Legacy Fallback Contamination Closure
-- Forward-Only Migration
-- =============================================================================

DO $$
DECLARE
  rec RECORD;
  path1_org TEXT;
  path2_org TEXT;
  canonical_org TEXT;
  ambiguous_count INTEGER := 0;
  unresolvable_count INTEGER := 0;
  repaired_count INTEGER := 0;
BEGIN
  -- Iterate through every Invoice in the system
  FOR rec IN SELECT id, "organizationId", "orderId" FROM "Invoice" LOOP
    path1_org := NULL;
    path2_org := NULL;

    -- Canonical Path 1: Invoice -> Order -> Quotation -> organizationId
    IF rec."orderId" IS NOT NULL THEN
      SELECT q."organizationId" INTO path1_org
      FROM "Order" o
      JOIN "Quotation" q ON o."quotationId" = q.id
      WHERE o.id = rec."orderId"
        AND q."organizationId" IS NOT NULL;
    END IF;

    -- Canonical Path 2: Invoice -> BillingMilestoneInvoiceLink -> ProjectBillingMilestone -> organizationId
    SELECT m."organizationId" INTO path2_org
    FROM "BillingMilestoneInvoiceLink" l
    JOIN "ProjectBillingMilestone" m ON l."billingMilestoneId" = m.id
    WHERE l."invoiceId" = rec.id
      AND m."organizationId" IS NOT NULL
    LIMIT 1;

    -- Evaluate Ambiguity (Path 1 and Path 2 disagree)
    IF path1_org IS NOT NULL AND path2_org IS NOT NULL AND path1_org <> path2_org THEN
      ambiguous_count := ambiguous_count + 1;
      RAISE NOTICE 'Phase 16D Ambiguity: Invoice % has conflicting canonical paths (Quotation: %, Milestone: %)', rec.id, path1_org, path2_org;
    END IF;

    -- Resolve Canonical Tenant (Path 1 takes precedence, fallback to Path 2 if Path 1 absent)
    canonical_org := COALESCE(path1_org, path2_org);

    -- Evaluate Unresolvable Ownership (No canonical path supports tenant assignment)
    IF canonical_org IS NULL THEN
      unresolvable_count := unresolvable_count + 1;
      RAISE NOTICE 'Phase 16D Unresolvable: Invoice % has no canonical relational evidence (Current organizationId: %)', rec.id, rec."organizationId";
    -- Repair Provable Mismatch (Legacy Phase 16B fallback populated wrong org, but canonical proof exists)
    ELSIF rec."organizationId" IS NULL OR rec."organizationId" <> canonical_org THEN
      UPDATE "Invoice"
      SET "organizationId" = canonical_org
      WHERE id = rec.id;

      repaired_count := repaired_count + 1;
      RAISE NOTICE 'Phase 16D Repaired Mismatch: Invoice % updated from % to canonical %', rec.id, rec."organizationId", canonical_org;
    END IF;
  END LOOP;

  -- Enforce Precondition Check 1: Abort if ambiguous canonical paths exist
  IF ambiguous_count > 0 THEN
    RAISE EXCEPTION 'Phase 16D Aborted: % Invoice record(s) have conflicting canonical tenant evidence.', ambiguous_count;
  END IF;

  -- Enforce Precondition Check 2: Abort if unresolvable invoices exist (Do NOT trust legacy fallback non-null organizationId)
  IF unresolvable_count > 0 THEN
    RAISE EXCEPTION 'Phase 16D Aborted: % Invoice record(s) lack canonical relational tenant evidence. Legacy non-null organizationId assignments cannot be trusted.', unresolvable_count;
  END IF;

  RAISE NOTICE 'Phase 16D Provenance Validation Complete: % mismatch(es) deterministically repaired.', repaired_count;
END $$;

-- -----------------------------------------------------------------------
-- Enforce Foreign Key & NOT NULL Constraints (Idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Invoice" ALTER COLUMN "organizationId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Invoice_organizationId_idx" ON "Invoice"("organizationId");
