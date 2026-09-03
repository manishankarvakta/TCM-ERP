-- Phase 18: Support Ticketing & SLA Engine

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "actualHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "estimatedHours" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'medium';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "recurrenceRule" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "SupportEntitlementType" AS ENUM ('WARRANTY', 'MAINTENANCE', 'SUPPORT_CONTRACT', 'INTERNAL', 'OTHER');
CREATE TYPE "SupportEntitlementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "SupportTicketType" AS ENUM ('BUG', 'INCIDENT', 'SERVICE_REQUEST', 'QUESTION', 'ACCESS_REQUEST', 'MAINTENANCE', 'OTHER');
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "SupportTicketSource" AS ENUM ('INTERNAL', 'EMAIL', 'PHONE', 'WHATSAPP', 'CLIENT_PORTAL', 'SYSTEM');
CREATE TYPE "SupportCoverageStatus" AS ENUM ('COVERED', 'NOT_COVERED', 'REQUIRES_REVIEW');
CREATE TYPE "SupportSLAStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'PAUSED', 'FIRST_RESPONSE_MET', 'FIRST_RESPONSE_BREACHED', 'RESOLUTION_MET', 'RESOLUTION_BREACHED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SupportCommentType" AS ENUM ('PUBLIC_REPLY', 'INTERNAL_NOTE');

-- CreateTable SupportEntitlement
CREATE TABLE IF NOT EXISTS "SupportEntitlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "agreementId" TEXT,
    "serviceSaleId" TEXT,
    "name" TEXT NOT NULL,
    "type" "SupportEntitlementType" NOT NULL DEFAULT 'WARRANTY',
    "status" "SupportEntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "coverageHours" TEXT,
    "supportWindow" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportSLAPolicy
CREATE TABLE IF NOT EXISTS "SupportSLAPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "firstResponseMinutes" INTEGER NOT NULL DEFAULT 60,
    "resolutionMinutes" INTEGER NOT NULL DEFAULT 1440,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "pauseOnWaitingClient" BOOLEAN NOT NULL DEFAULT true,
    "pauseOnWaitingThirdParty" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSLAPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketSequence
CREATE TABLE IF NOT EXISTS "SupportTicketSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicket
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "projectId" TEXT,
    "entitlementId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SupportTicketType" NOT NULL DEFAULT 'INCIDENT',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "reportedPriority" "SupportTicketPriority",
    "effectivePriority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "source" "SupportTicketSource" NOT NULL DEFAULT 'INTERNAL',
    "coverageStatus" "SupportCoverageStatus" NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "reportedByUserId" TEXT,
    "reportedByContactId" TEXT,
    "assignedUserId" TEXT,
    "assignedEmployeeId" TEXT,
    "assignedDepartmentId" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "slaPolicyId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketSLA
CREATE TABLE IF NOT EXISTS "SupportTicketSLA" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "policyId" TEXT,
    "firstResponseMinutesSnapshot" INTEGER NOT NULL,
    "resolutionMinutesSnapshot" INTEGER NOT NULL,
    "businessHoursOnlySnapshot" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseDueAt" TIMESTAMP(3) NOT NULL,
    "resolutionDueAt" TIMESTAMP(3) NOT NULL,
    "firstRespondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "totalPausedMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "SupportSLAStatus" NOT NULL DEFAULT 'RUNNING',
    "firstResponseStatus" "SupportSLAStatus" NOT NULL DEFAULT 'RUNNING',
    "resolutionStatus" "SupportSLAStatus" NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketSLA_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportSLAPause
CREATE TABLE IF NOT EXISTS "SupportSLAPause" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketSlaId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSLAPause_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketComment
CREATE TABLE IF NOT EXISTS "SupportTicketComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorContactId" TEXT,
    "type" "SupportCommentType" NOT NULL DEFAULT 'PUBLIC_REPLY',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketAuditLog
CREATE TABLE IF NOT EXISTS "SupportTicketAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketIssueLink
CREATE TABLE IF NOT EXISTS "SupportTicketIssueLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketIssueLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable SupportTicketTaskLink
CREATE TABLE IF NOT EXISTS "SupportTicketTaskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupportSLAPolicy_organizationId_code_key" ON "SupportSLAPolicy"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicketSequence_organizationId_year_key" ON "SupportTicketSequence"("organizationId", "year");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicketSLA_ticketId_key" ON "SupportTicketSLA"("ticketId");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicketIssueLink_ticketId_issueId_key" ON "SupportTicketIssueLink"("ticketId", "issueId");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicketTaskLink_ticketId_taskId_key" ON "SupportTicketTaskLink"("ticketId", "taskId");

-- AddForeignKey
ALTER TABLE "SupportEntitlement" ADD CONSTRAINT "SupportEntitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportEntitlement" ADD CONSTRAINT "SupportEntitlement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportEntitlement" ADD CONSTRAINT "SupportEntitlement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportSLAPolicy" ADD CONSTRAINT "SupportSLAPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketSequence" ADD CONSTRAINT "SupportTicketSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "SupportEntitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "SupportSLAPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportTicketSLA" ADD CONSTRAINT "SupportTicketSLA_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketSLA" ADD CONSTRAINT "SupportTicketSLA_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketSLA" ADD CONSTRAINT "SupportTicketSLA_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SupportSLAPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SupportSLAPause" ADD CONSTRAINT "SupportSLAPause_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportSLAPause" ADD CONSTRAINT "SupportSLAPause_ticketSlaId_fkey" FOREIGN KEY ("ticketSlaId") REFERENCES "SupportTicketSLA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketComment" ADD CONSTRAINT "SupportTicketComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketComment" ADD CONSTRAINT "SupportTicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketAuditLog" ADD CONSTRAINT "SupportTicketAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAuditLog" ADD CONSTRAINT "SupportTicketAuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketIssueLink" ADD CONSTRAINT "SupportTicketIssueLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketIssueLink" ADD CONSTRAINT "SupportTicketIssueLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketIssueLink" ADD CONSTRAINT "SupportTicketIssueLink_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicketTaskLink" ADD CONSTRAINT "SupportTicketTaskLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicketTaskLink" ADD CONSTRAINT "SupportTicketTaskLink_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketTaskLink" ADD CONSTRAINT "SupportTicketTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
