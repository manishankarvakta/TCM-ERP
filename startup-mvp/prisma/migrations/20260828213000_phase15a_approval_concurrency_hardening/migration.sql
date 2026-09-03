-- Phase 15A Approval Concurrency Hardening Migration

CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRequest_active_unique"
ON "ApprovalRequest" ("organizationId", "sourceType", "sourceId", "policyId")
WHERE "status" IN ('DRAFT', 'PENDING', 'IN_PROGRESS');
