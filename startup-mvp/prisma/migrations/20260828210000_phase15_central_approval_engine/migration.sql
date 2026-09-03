-- Phase 15 Central Approval Engine Migration

DO $$ BEGIN
  CREATE TYPE "ApprovalRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'STALE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalSourceType" AS ENUM ('CREATIVE_COMPLETION', 'MARKETING_COMPLETION', 'DEVELOPMENT_COMPLETION', 'QA_COMPLETION', 'UAT_READINESS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalMode" AS ENUM ('ANY', 'ALL', 'MINIMUM_COUNT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'BYPASSED', 'STALE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ApprovalPolicy" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "sourceType" "ApprovalSourceType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ApprovalPolicy"
  ADD CONSTRAINT "ApprovalPolicy_organizationId_code_key" UNIQUE ("organizationId", "code");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ApprovalPolicy_organizationId_idx" ON "ApprovalPolicy"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalPolicy_sourceType_idx" ON "ApprovalPolicy"("sourceType");

CREATE TABLE IF NOT EXISTS "ApprovalPolicyStep" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'ANY'::"ApprovalMode",
  "minimumApprovals" INTEGER NOT NULL DEFAULT 1,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalPolicyStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalPolicyStep_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalPolicyStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ApprovalPolicyStep"
  ADD CONSTRAINT "ApprovalPolicyStep_policyId_sequence_key" UNIQUE ("policyId", "sequence");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ApprovalPolicyStep_organizationId_idx" ON "ApprovalPolicyStep"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalPolicyStep_policyId_idx" ON "ApprovalPolicyStep"("policyId");

CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requestNumber" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "sourceType" "ApprovalSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceVersion" TEXT,
  "sourceFingerprint" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'DRAFT'::"ApprovalRequestStatus",
  "currentStepSequence" INTEGER NOT NULL DEFAULT 1,
  "requestedById" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "staleAt" TIMESTAMP(3),
  "staleReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ApprovalPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ApprovalRequest_organizationId_idx" ON "ApprovalRequest"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_sourceType_sourceId_idx" ON "ApprovalRequest"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

CREATE TABLE IF NOT EXISTS "ApprovalStepInstance" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'ANY'::"ApprovalMode",
  "minimumApprovals" INTEGER NOT NULL DEFAULT 1,
  "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING'::"ApprovalStepStatus",
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalStepInstance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalStepInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalStepInstance_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ApprovalStepInstance"
  ADD CONSTRAINT "ApprovalStepInstance_approvalRequestId_sequence_key" UNIQUE ("approvalRequestId", "sequence");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ApprovalStepInstance_organizationId_idx" ON "ApprovalStepInstance"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalStepInstance_approvalRequestId_idx" ON "ApprovalStepInstance"("approvalRequestId");

CREATE TABLE IF NOT EXISTS "ApprovalStepApprover" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stepInstanceId" TEXT NOT NULL,
  "approverUserId" TEXT NOT NULL,
  "approverRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalStepApprover_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalStepApprover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalStepApprover_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ApprovalStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalStepApprover_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ApprovalStepApprover"
  ADD CONSTRAINT "ApprovalStepApprover_stepInstanceId_approverUserId_key" UNIQUE ("stepInstanceId", "approverUserId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ApprovalStepApprover_organizationId_idx" ON "ApprovalStepApprover"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalStepApprover_stepInstanceId_idx" ON "ApprovalStepApprover"("stepInstanceId");

CREATE TABLE IF NOT EXISTS "ApprovalDecision" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "approvalRequestId" TEXT NOT NULL,
  "stepInstanceId" TEXT NOT NULL,
  "approverUserId" TEXT NOT NULL,
  "decision" "ApprovalDecisionType" NOT NULL,
  "comment" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApprovalDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ApprovalDecision_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalDecision_stepInstanceId_fkey" FOREIGN KEY ("stepInstanceId") REFERENCES "ApprovalStepInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApprovalDecision_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ApprovalDecision"
  ADD CONSTRAINT "ApprovalDecision_stepInstanceId_approverUserId_key" UNIQUE ("stepInstanceId", "approverUserId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ApprovalDecision_organizationId_idx" ON "ApprovalDecision"("organizationId");
CREATE INDEX IF NOT EXISTS "ApprovalDecision_approvalRequestId_idx" ON "ApprovalDecision"("approvalRequestId");
CREATE INDEX IF NOT EXISTS "ApprovalDecision_stepInstanceId_idx" ON "ApprovalDecision"("stepInstanceId");
