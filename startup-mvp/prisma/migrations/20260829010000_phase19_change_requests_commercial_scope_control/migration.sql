-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('SCOPE_ADD', 'SCOPE_REMOVE', 'SCOPE_MODIFY', 'TIMELINE_CHANGE', 'COMMERCIAL_CHANGE', 'DELIVERY_CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeRequestSource" AS ENUM ('CLIENT', 'INTERNAL', 'SUPPORT_ESCALATION', 'DELIVERY', 'MANAGEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_ANALYSIS', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApprovalSourceType" ADD VALUE 'CHANGE_REQUEST';

-- CreateTable
CREATE TABLE "ChangeRequestSequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequestSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeRequestNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT,
    "agreementId" TEXT,
    "serviceSaleId" TEXT,
    "billingPlanId" TEXT,
    "supportTicketId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changeType" "ChangeRequestType" NOT NULL DEFAULT 'SCOPE_MODIFY',
    "source" "ChangeRequestSource" NOT NULL DEFAULT 'INTERNAL',
    "businessReason" TEXT,
    "requestedScope" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "baselineVersion" INTEGER NOT NULL DEFAULT 1,
    "baselineContractAmount" DECIMAL(12,2),
    "baselinePlannedEndDate" TIMESTAMP(3),
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "staleAt" TIMESTAMP(3),
    "staleReason" TEXT,
    "deliveryImpact" TEXT,
    "timelineImpactDays" INTEGER NOT NULL DEFAULT 0,
    "commercialImpactAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "costImpactAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "profitabilityImpactMargin" DOUBLE PRECISION,
    "revisedContractAmount" DECIMAL(12,2),
    "approvalRequestId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "analyzedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAmendment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agreementId" TEXT,
    "billingPlanId" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "previousContractAmount" DECIMAL(12,2) NOT NULL,
    "newContractAmount" DECIMAL(12,2) NOT NULL,
    "contractDelta" DECIMAL(12,2) NOT NULL,
    "previousPlannedEndDate" TIMESTAMP(3),
    "newPlannedEndDate" TIMESTAMP(3),
    "appliedById" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequestIssueLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequestIssueLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequestTaskLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequestTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequestAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeRequestAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequestSequence_organizationId_year_key" ON "ChangeRequestSequence"("organizationId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_changeRequestNumber_key" ON "ChangeRequest"("changeRequestNumber");

-- CreateIndex
CREATE INDEX "ChangeRequest_organizationId_idx" ON "ChangeRequest"("organizationId");

-- CreateIndex
CREATE INDEX "ChangeRequest_projectId_idx" ON "ChangeRequest"("projectId");

-- CreateIndex
CREATE INDEX "ChangeRequest_clientId_idx" ON "ChangeRequest"("clientId");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ChangeRequest_approvalRequestId_idx" ON "ChangeRequest"("approvalRequestId");

-- CreateIndex
CREATE INDEX "CommercialAmendment_organizationId_idx" ON "CommercialAmendment"("organizationId");

-- CreateIndex
CREATE INDEX "CommercialAmendment_changeRequestId_idx" ON "CommercialAmendment"("changeRequestId");

-- CreateIndex
CREATE INDEX "CommercialAmendment_projectId_idx" ON "CommercialAmendment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialAmendment_projectId_versionNumber_key" ON "CommercialAmendment"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "ChangeRequestIssueLink_organizationId_idx" ON "ChangeRequestIssueLink"("organizationId");

-- CreateIndex
CREATE INDEX "ChangeRequestIssueLink_changeRequestId_idx" ON "ChangeRequestIssueLink"("changeRequestId");

-- CreateIndex
CREATE INDEX "ChangeRequestIssueLink_issueId_idx" ON "ChangeRequestIssueLink"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequestIssueLink_changeRequestId_issueId_key" ON "ChangeRequestIssueLink"("changeRequestId", "issueId");

-- CreateIndex
CREATE INDEX "ChangeRequestTaskLink_organizationId_idx" ON "ChangeRequestTaskLink"("organizationId");

-- CreateIndex
CREATE INDEX "ChangeRequestTaskLink_changeRequestId_idx" ON "ChangeRequestTaskLink"("changeRequestId");

-- CreateIndex
CREATE INDEX "ChangeRequestTaskLink_taskId_idx" ON "ChangeRequestTaskLink"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequestTaskLink_changeRequestId_taskId_key" ON "ChangeRequestTaskLink"("changeRequestId", "taskId");

-- CreateIndex
CREATE INDEX "ChangeRequestAuditLog_organizationId_idx" ON "ChangeRequestAuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "ChangeRequestAuditLog_changeRequestId_idx" ON "ChangeRequestAuditLog"("changeRequestId");

-- CreateIndex
CREATE INDEX "ChangeRequestAuditLog_actorUserId_idx" ON "ChangeRequestAuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "ChangeRequestSequence" ADD CONSTRAINT "ChangeRequestSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_serviceSaleId_fkey" FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "ProjectBillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "ProjectBillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAmendment" ADD CONSTRAINT "CommercialAmendment_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestIssueLink" ADD CONSTRAINT "ChangeRequestIssueLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestIssueLink" ADD CONSTRAINT "ChangeRequestIssueLink_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestIssueLink" ADD CONSTRAINT "ChangeRequestIssueLink_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestTaskLink" ADD CONSTRAINT "ChangeRequestTaskLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestTaskLink" ADD CONSTRAINT "ChangeRequestTaskLink_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestTaskLink" ADD CONSTRAINT "ChangeRequestTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestAuditLog" ADD CONSTRAINT "ChangeRequestAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequestAuditLog" ADD CONSTRAINT "ChangeRequestAuditLog_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
