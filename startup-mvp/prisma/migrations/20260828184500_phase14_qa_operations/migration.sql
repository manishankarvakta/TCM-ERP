-- Phase 14 QA Operations Engine & Phase 13C Persisted Department Dependency Migration

-- Development Engine Models (Phase 13 Prerequisite)
DO $$ BEGIN
  CREATE TYPE "DevelopmentPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DevelopmentWorkstreamType" AS ENUM ('FRONTEND', 'BACKEND', 'DATABASE', 'DEVOPS', 'MOBILE', 'INTEGRATION', 'QA_AUTOMATION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DevelopmentWorkstreamStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'CODE_REVIEW', 'TESTING', 'COMPLETED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CodeReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "BuildStatus" AS ENUM ('IN_PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "ProjectDevelopmentPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "architectureNotes" TEXT,
  "repositoryUrl" TEXT,
  "branchStrategy" TEXT,
  "startDate" TIMESTAMP(3),
  "targetEndDate" TIMESTAMP(3),
  "status" "DevelopmentPlanStatus" NOT NULL DEFAULT 'DRAFT'::"DevelopmentPlanStatus",
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDevelopmentPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDevelopmentPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProjectDevelopmentWorkstream" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "developmentPlanId" TEXT,
  "name" TEXT NOT NULL,
  "type" "DevelopmentWorkstreamType" NOT NULL DEFAULT 'BACKEND'::"DevelopmentWorkstreamType",
  "status" "DevelopmentWorkstreamStatus" NOT NULL DEFAULT 'DRAFT'::"DevelopmentWorkstreamStatus",
  "codeReviewStatus" "CodeReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED'::"CodeReviewStatus",
  "assignedEmployeeId" TEXT,
  "taskId" TEXT,
  "startDate" TIMESTAMP(3),
  "targetEndDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDevelopmentWorkstream_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDevelopmentWorkstream_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentWorkstream_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentWorkstream_developmentPlanId_fkey" FOREIGN KEY ("developmentPlanId") REFERENCES "ProjectDevelopmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentWorkstream_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentWorkstream_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectDevelopmentWorkstream_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "ProjectDevelopmentWorkstream"
ADD COLUMN IF NOT EXISTS "developmentPlanId" TEXT,
ADD COLUMN IF NOT EXISTS "assignedEmployeeId" TEXT,
ADD COLUMN IF NOT EXISTS "taskId" TEXT;

CREATE TABLE IF NOT EXISTS "DevelopmentTechnicalDeliverable" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workstreamId" TEXT NOT NULL,
  "taskId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "deliverableType" TEXT NOT NULL DEFAULT 'FEATURE',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "codeReviewStatus" "CodeReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED'::"CodeReviewStatus",
  "assignedEmployeeId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DevelopmentTechnicalDeliverable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentTechnicalDeliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentTechnicalDeliverable_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "ProjectDevelopmentWorkstream"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentTechnicalDeliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentTechnicalDeliverable_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentTechnicalDeliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DevelopmentBuildRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workstreamId" TEXT NOT NULL,
  "buildNumber" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'Staging',
  "status" "BuildStatus" NOT NULL DEFAULT 'IN_PROGRESS'::"BuildStatus",
  "notes" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "DevelopmentBuildRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DevelopmentBuildRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentBuildRecord_workstreamId_fkey" FOREIGN KEY ("workstreamId") REFERENCES "ProjectDevelopmentWorkstream"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DevelopmentBuildRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectDevelopmentPlan_organizationId_idx" ON "ProjectDevelopmentPlan"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentPlan_projectId_idx" ON "ProjectDevelopmentPlan"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentPlan_status_idx" ON "ProjectDevelopmentPlan"("status");

CREATE INDEX IF NOT EXISTS "ProjectDevelopmentWorkstream_organizationId_idx" ON "ProjectDevelopmentWorkstream"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentWorkstream_projectId_idx" ON "ProjectDevelopmentWorkstream"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentWorkstream_developmentPlanId_idx" ON "ProjectDevelopmentWorkstream"("developmentPlanId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentWorkstream_assignedEmployeeId_idx" ON "ProjectDevelopmentWorkstream"("assignedEmployeeId");
CREATE INDEX IF NOT EXISTS "ProjectDevelopmentWorkstream_status_idx" ON "ProjectDevelopmentWorkstream"("status");

CREATE INDEX IF NOT EXISTS "DevelopmentTechnicalDeliverable_organizationId_idx" ON "DevelopmentTechnicalDeliverable"("organizationId");
CREATE INDEX IF NOT EXISTS "DevelopmentTechnicalDeliverable_workstreamId_idx" ON "DevelopmentTechnicalDeliverable"("workstreamId");
CREATE INDEX IF NOT EXISTS "DevelopmentTechnicalDeliverable_status_idx" ON "DevelopmentTechnicalDeliverable"("status");

CREATE INDEX IF NOT EXISTS "DevelopmentBuildRecord_organizationId_idx" ON "DevelopmentBuildRecord"("organizationId");
CREATE INDEX IF NOT EXISTS "DevelopmentBuildRecord_workstreamId_idx" ON "DevelopmentBuildRecord"("workstreamId");
CREATE INDEX IF NOT EXISTS "DevelopmentBuildRecord_recordedAt_idx" ON "DevelopmentBuildRecord"("recordedAt");

CREATE TABLE IF NOT EXISTS "ProjectDepartmentDependency" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "upstreamCapability" TEXT NOT NULL,
  "downstreamCapability" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDepartmentDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDepartmentDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectDepartmentDependency_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectDepartmentDependency_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

DO $$ BEGIN
  ALTER TABLE "ProjectDepartmentDependency"
  ADD CONSTRAINT "ProjectDepartmentDependency_projectId_upstreamCapability_downstreamCapability_key"
  UNIQUE ("projectId", "upstreamCapability", "downstreamCapability");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ProjectDepartmentDependency_organizationId_idx" ON "ProjectDepartmentDependency"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectDepartmentDependency_projectId_idx" ON "ProjectDepartmentDependency"("projectId");

DO $$ BEGIN
  CREATE TYPE "QARequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QAPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'IN_REVIEW', 'APPROVED', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QATestCycleType" AS ENUM ('SMOKE', 'FUNCTIONAL', 'INTEGRATION', 'REGRESSION', 'RELEASE_CANDIDATE', 'UAT_PREP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QATestCycleStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QATestCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QATestExecutionStatus" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
ADD COLUMN IF NOT EXISTS "qaExecutionReadyAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "qaExecutionReadyById" TEXT,
ADD COLUMN IF NOT EXISTS "qaWorkRequirement" "QARequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED'::"QARequirementStatus",
ADD COLUMN IF NOT EXISTS "qaCompletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "qaCompletedById" TEXT;

CREATE TABLE IF NOT EXISTS "ProjectQAPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "objective" TEXT,
  "scope" TEXT,
  "outOfScope" TEXT,
  "testStrategy" TEXT,
  "entryCriteria" TEXT,
  "exitCriteria" TEXT,
  "environment" TEXT DEFAULT 'Staging',
  "status" "QAPlanStatus" NOT NULL DEFAULT 'DRAFT'::"QAPlanStatus",
  "startDate" TIMESTAMP(3),
  "targetEndDate" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectQAPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectQAPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectQAPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectQAPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProjectQAPlan_organizationId_idx" ON "ProjectQAPlan"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectQAPlan_projectId_idx" ON "ProjectQAPlan"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectQAPlan_status_idx" ON "ProjectQAPlan"("status");

CREATE TABLE IF NOT EXISTS "ProjectQATestCycle" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "qaPlanId" TEXT,
  "name" TEXT NOT NULL,
  "type" "QATestCycleType" NOT NULL DEFAULT 'FUNCTIONAL'::"QATestCycleType",
  "buildRecordId" TEXT,
  "environment" TEXT DEFAULT 'Staging',
  "status" "QATestCycleStatus" NOT NULL DEFAULT 'PLANNED'::"QATestCycleStatus",
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "assignedEmployeeId" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectQATestCycle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectQATestCycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProjectQATestCycle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectQATestCycle_qaPlanId_fkey" FOREIGN KEY ("qaPlanId") REFERENCES "ProjectQAPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectQATestCycle_buildRecordId_fkey" FOREIGN KEY ("buildRecordId") REFERENCES "DevelopmentBuildRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectQATestCycle_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProjectQATestCycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "ProjectQATestCycle"
ADD COLUMN IF NOT EXISTS "buildRecordId" TEXT,
ADD COLUMN IF NOT EXISTS "assignedEmployeeId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectQATestCycle_organizationId_idx" ON "ProjectQATestCycle"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectQATestCycle_projectId_idx" ON "ProjectQATestCycle"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectQATestCycle_qaPlanId_idx" ON "ProjectQATestCycle"("qaPlanId");
CREATE INDEX IF NOT EXISTS "ProjectQATestCycle_assignedEmployeeId_idx" ON "ProjectQATestCycle"("assignedEmployeeId");
CREATE INDEX IF NOT EXISTS "ProjectQATestCycle_status_idx" ON "ProjectQATestCycle"("status");

CREATE TABLE IF NOT EXISTS "QATestCase" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "qaPlanId" TEXT,
  "taskId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "preconditions" TEXT,
  "expectedResult" TEXT,
  "priority" "QATestCasePriority" NOT NULL DEFAULT 'MEDIUM'::"QATestCasePriority",
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QATestCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QATestCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QATestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QATestCase_qaPlanId_fkey" FOREIGN KEY ("qaPlanId") REFERENCES "ProjectQAPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QATestCase_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QATestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "QATestCase_organizationId_idx" ON "QATestCase"("organizationId");
CREATE INDEX IF NOT EXISTS "QATestCase_projectId_idx" ON "QATestCase"("projectId");
CREATE INDEX IF NOT EXISTS "QATestCase_qaPlanId_idx" ON "QATestCase"("qaPlanId");

CREATE TABLE IF NOT EXISTS "QATestExecution" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  "testCycleId" TEXT NOT NULL,
  "executionSequence" INTEGER NOT NULL DEFAULT 1,
  "buildRecordId" TEXT,
  "executedByEmployeeId" TEXT,
  "status" "QATestExecutionStatus" NOT NULL DEFAULT 'NOT_RUN'::"QATestExecutionStatus",
  "actualResult" TEXT,
  "notes" TEXT,
  "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "QATestExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QATestExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "QATestExecution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "QATestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QATestExecution_testCycleId_fkey" FOREIGN KEY ("testCycleId") REFERENCES "ProjectQATestCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QATestExecution_buildRecordId_fkey" FOREIGN KEY ("buildRecordId") REFERENCES "DevelopmentBuildRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QATestExecution_executedByEmployeeId_fkey" FOREIGN KEY ("executedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QATestExecution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "QATestExecution"
ADD COLUMN IF NOT EXISTS "executionSequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "buildRecordId" TEXT,
ADD COLUMN IF NOT EXISTS "executedByEmployeeId" TEXT;

CREATE INDEX IF NOT EXISTS "QATestExecution_organizationId_idx" ON "QATestExecution"("organizationId");
CREATE INDEX IF NOT EXISTS "QATestExecution_testCaseId_idx" ON "QATestExecution"("testCaseId");
CREATE INDEX IF NOT EXISTS "QATestExecution_testCycleId_idx" ON "QATestExecution"("testCycleId");
CREATE INDEX IF NOT EXISTS "QATestExecution_testCaseId_executionSequence_idx" ON "QATestExecution"("testCaseId", "executionSequence");
CREATE INDEX IF NOT EXISTS "QATestExecution_status_idx" ON "QATestExecution"("status");

-- Backfill executionSequence for existing groups
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "testCaseId", "testCycleId"
    ORDER BY "executedAt" ASC, id ASC
  ) as seq
  FROM "QATestExecution"
)
UPDATE "QATestExecution" e
SET "executionSequence" = ranked.seq
FROM ranked
WHERE e.id = ranked.id;

DO $$ BEGIN
  ALTER TABLE "QATestExecution"
  ADD CONSTRAINT "QATestExecution_testCaseId_testCycleId_executionSequence_key"
  UNIQUE ("testCaseId", "testCycleId", "executionSequence");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null; END $$;
