-- =============================================================================
-- Phase 16E — Multi-Link Tenant Provenance Ambiguity Final Closure
-- Forward-Only Migration
-- =============================================================================

DO $$
DECLARE
  rec RECORD;
  path1_org TEXT;
  path2_org TEXT;
  path2_distinct_count INTEGER;
  canonical_org TEXT;
  ambiguous_multilink_count INTEGER := 0;
  ambiguous_conflict_count INTEGER := 0;
  unresolvable_count INTEGER := 0;
  repaired_count INTEGER := 0;
BEGIN
  -- Validate tenant provenance for EVERY Invoice in the system without LIMIT 1
  FOR rec IN SELECT id, "organizationId", "orderId" FROM "Invoice" LOOP
    path1_org := NULL;
    path2_org := NULL;
    path2_distinct_count := 0;

    -- Path 1: Invoice -> Order -> Quotation -> organizationId
    IF rec."orderId" IS NOT NULL THEN
      SELECT q."organizationId" INTO path1_org
      FROM "Order" o
      JOIN "Quotation" q ON o."quotationId" = q.id
      WHERE o.id = rec."orderId"
        AND q."organizationId" IS NOT NULL;
    END IF;

    -- Path 2: Invoice -> BillingMilestoneInvoiceLink -> ProjectBillingMilestone -> organizationId
    -- Check DISTINCT count of milestone tenant organizations linked to this Invoice
    SELECT COUNT(DISTINCT m."organizationId"), MIN(m."organizationId")
    INTO path2_distinct_count, path2_org
    FROM "BillingMilestoneInvoiceLink" l
    JOIN "ProjectBillingMilestone" m ON l."billingMilestoneId" = m.id
    WHERE l."invoiceId" = rec.id
      AND m."organizationId" IS NOT NULL;

    -- Evaluate Path 2 Multi-Link Ambiguity (More than 1 distinct milestone tenant org)
    IF path2_distinct_count > 1 THEN
      ambiguous_multilink_count := ambiguous_multilink_count + 1;
      RAISE NOTICE 'Phase 16E Multi-Link Ambiguity: Invoice % has % distinct milestone link organizations.', rec.id, path2_distinct_count;
    END IF;

    -- Evaluate Path 1 vs Path 2 Conflict
    IF path1_org IS NOT NULL AND path2_distinct_count = 1 AND path1_org <> path2_org THEN
      ambiguous_conflict_count := ambiguous_conflict_count + 1;
      RAISE NOTICE 'Phase 16E Path Conflict: Invoice % has Path 1 % vs Path 2 %', rec.id, path1_org, path2_org;
    END IF;

    -- Resolve Canonical Tenant
    IF path2_distinct_count > 1 OR (path1_org IS NOT NULL AND path2_distinct_count = 1 AND path1_org <> path2_org) THEN
      canonical_org := NULL; -- Ambiguous
    ELSIF path1_org IS NOT NULL AND path2_distinct_count = 1 AND path1_org = path2_org THEN
      canonical_org := path1_org; -- Both agree
    ELSIF path1_org IS NOT NULL THEN
      canonical_org := path1_org; -- Path 1 only
    ELSIF path2_distinct_count = 1 THEN
      canonical_org := path2_org; -- Path 2 only (unambiguous)
    ELSE
      canonical_org := NULL; -- Neither path exists
    END IF;

    -- Evaluate Unresolvable Ownership
    IF canonical_org IS NULL THEN
      unresolvable_count := unresolvable_count + 1;
      RAISE NOTICE 'Phase 16E Unresolvable/Ambiguous: Invoice % cannot be safely resolved (Current: %)', rec.id, rec."organizationId";
    -- Repair Deterministic Mismatch (Safe only when canonical_org is 100% unambiguous)
    ELSIF rec."organizationId" IS NULL OR rec."organizationId" <> canonical_org THEN
      UPDATE "Invoice"
      SET "organizationId" = canonical_org
      WHERE id = rec.id;

      repaired_count := repaired_count + 1;
      RAISE NOTICE 'Phase 16E Repaired Invoice % to canonical %', rec.id, canonical_org;
    END IF;
  END LOOP;

  -- Precondition Check 1: Abort if multi-link tenant ambiguity exists
  IF ambiguous_multilink_count > 0 THEN
    RAISE EXCEPTION 'Phase 16E Aborted: % Invoice record(s) have multiple distinct milestone link tenant organizations. Arbitrary row selection (LIMIT 1) is strictly forbidden.', ambiguous_multilink_count;
  END IF;

  -- Precondition Check 2: Abort if Path 1 vs Path 2 conflict exists
  IF ambiguous_conflict_count > 0 THEN
    RAISE EXCEPTION 'Phase 16E Aborted: % Invoice record(s) have conflicting Path 1 vs Path 2 canonical tenant evidence.', ambiguous_conflict_count;
  END IF;

  -- Precondition Check 3: Abort if any Invoice has unresolvable tenant ownership
  IF unresolvable_count > 0 THEN
    RAISE EXCEPTION 'Phase 16E Aborted: % Invoice record(s) lack unambiguous relational tenant evidence.', unresolvable_count;
  END IF;

  RAISE NOTICE 'Phase 16E Multi-Link Validation Complete: % mismatch(es) deterministically repaired.', repaired_count;
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
