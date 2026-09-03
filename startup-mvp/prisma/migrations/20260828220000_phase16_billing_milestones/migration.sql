-- =============================================================================
-- Phase 16 — Billing Milestones & Project Billability Engine
-- Includes Phase 6 Agreement & Service Sale Engine (reconciliation for clean deploy)
-- =============================================================================

-- -----------------------------------------------------------------------
-- Phase 6: Agreement & Contract Engine Enums (idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "AgreementStatus" AS ENUM (
    'DRAFT','INTERNAL_REVIEW','READY_FOR_CLIENT','SENT','CLIENT_REVIEW',
    'ACCEPTED','SIGNED','ACTIVE','REJECTED','EXPIRED','TERMINATED',
    'CANCELLED','SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgreementType" AS ENUM (
    'PROJECT','SERVICE','MAINTENANCE','RETAINER','SUPPORT','CONSULTING',
    'TRAINING','SUBSCRIPTION','MASTER_SERVICE','STATEMENT_OF_WORK','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AcceptanceMethod" AS ENUM (
    'SIGNED_DOCUMENT','EMAIL_CONFIRMATION','DIGITAL_ACCEPTANCE',
    'PHYSICAL_SIGNATURE','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceSaleStatus" AS ENUM (
    'DRAFT','INTERNAL_REVIEW','APPROVED','CONFIRMED',
    'IN_FULFILLMENT','FULFILLED','CANCELLED','VOID','CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FulfillmentStatus" AS ENUM (
    'NOT_STARTED','IN_PROGRESS','PARTIALLY_FULFILLED',
    'FULLY_FULFILLED','ON_HOLD','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectHandoverStatus" AS ENUM (
    'DRAFT','SUBMITTED','ACCEPTED','PROJECT_CREATED','REJECTED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------
-- Phase 6: Agreement Table
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Agreement" (
    "id"                        TEXT NOT NULL,
    "organizationId"            TEXT NOT NULL,
    "agreementNumber"           TEXT NOT NULL,
    "quotationId"               TEXT NOT NULL,
    "opportunityId"             TEXT,
    "requirementId"             TEXT,
    "estimationId"              TEXT,
    "clientId"                  TEXT NOT NULL,
    "contactId"                 TEXT,
    "title"                     TEXT NOT NULL,
    "agreementType"             "AgreementType" NOT NULL DEFAULT 'PROJECT',
    "version"                   INTEGER NOT NULL DEFAULT 1,
    "status"                    "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "currency"                  TEXT NOT NULL DEFAULT 'TK',
    "contractValue"             DECIMAL(12,2) NOT NULL,
    "effectiveDate"             TIMESTAMP(3),
    "startDate"                 TIMESTAMP(3),
    "endDate"                   TIMESTAMP(3),
    "signedDate"                TIMESTAMP(3),
    "expiryDate"                TIMESTAMP(3),
    "paymentTerms"              TEXT,
    "deliveryTerms"             TEXT,
    "clientResponsibilities"    TEXT,
    "companyResponsibilities"   TEXT,
    "terminationTerms"          TEXT,
    "renewalTerms"              TEXT,
    "scopeSummary"              TEXT,
    "specialConditions"         TEXT,
    "internalNotes"             TEXT,
    "preparedById"              TEXT NOT NULL,
    "reviewedById"              TEXT,
    "approvedById"              TEXT,
    "acceptedByName"            TEXT,
    "acceptedByContactId"       TEXT,
    "acceptedAt"                TIMESTAMP(3),
    "acceptanceMethod"          "AcceptanceMethod",
    "acceptanceReference"       TEXT,
    "signedAt"                  TIMESTAMP(3),
    "signedFileId"              TEXT,
    "readyForServiceSaleAt"     TIMESTAMP(3),
    "readyForServiceSaleById"   TEXT,
    "parentAgreementId"         TEXT,
    "commercialSnapshotJson"    JSONB,
    "isTrash"                   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Agreement_organizationId_agreementNumber_key" ON "Agreement"("organizationId","agreementNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Agreement_organizationId_quotationId_version_key" ON "Agreement"("organizationId","quotationId","version");
CREATE INDEX IF NOT EXISTS "Agreement_organizationId_idx" ON "Agreement"("organizationId");
CREATE INDEX IF NOT EXISTS "Agreement_quotationId_idx" ON "Agreement"("quotationId");
CREATE INDEX IF NOT EXISTS "Agreement_opportunityId_idx" ON "Agreement"("opportunityId");
CREATE INDEX IF NOT EXISTS "Agreement_clientId_idx" ON "Agreement"("clientId");

-- -----------------------------------------------------------------------
-- Phase 6: Agreement Sub-Tables
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AgreementSection" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agreementId"    TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "content"        TEXT,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementSection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgreementSection_organizationId_idx" ON "AgreementSection"("organizationId");
CREATE INDEX IF NOT EXISTS "AgreementSection_agreementId_idx" ON "AgreementSection"("agreementId");

CREATE TABLE IF NOT EXISTS "AgreementPaymentSchedule" (
    "id"                    TEXT NOT NULL,
    "organizationId"        TEXT NOT NULL,
    "agreementId"           TEXT NOT NULL,
    "label"                 TEXT NOT NULL,
    "percentage"            DECIMAL(5,2),
    "amount"                DECIMAL(12,2) NOT NULL,
    "dueTriggerDescription" TEXT,
    "sortOrder"              INTEGER NOT NULL DEFAULT 0,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementPaymentSchedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgreementPaymentSchedule_organizationId_idx" ON "AgreementPaymentSchedule"("organizationId");
CREATE INDEX IF NOT EXISTS "AgreementPaymentSchedule_agreementId_idx" ON "AgreementPaymentSchedule"("agreementId");

CREATE TABLE IF NOT EXISTS "AgreementSnapshotItem" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agreementId"    TEXT NOT NULL,
    "code"           TEXT,
    "description"    TEXT NOT NULL,
    "quantity"       DECIMAL(10,2) NOT NULL,
    "unitPrice"      DECIMAL(12,2) NOT NULL,
    "amount"         DECIMAL(12,2) NOT NULL,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementSnapshotItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgreementSnapshotItem_organizationId_idx" ON "AgreementSnapshotItem"("organizationId");
CREATE INDEX IF NOT EXISTS "AgreementSnapshotItem_agreementId_idx" ON "AgreementSnapshotItem"("agreementId");

-- -----------------------------------------------------------------------
-- Phase 6: ServiceSale Tables
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ServiceSale" (
    "id"                      TEXT NOT NULL,
    "organizationId"          TEXT NOT NULL,
    "serviceSaleNumber"       TEXT NOT NULL,
    "agreementId"             TEXT NOT NULL,
    "agreementNumberSnapshot" TEXT NOT NULL,
    "agreementVersionSnapshot" INTEGER NOT NULL DEFAULT 1,
    "quotationId"             TEXT,
    "opportunityId"           TEXT,
    "requirementId"           TEXT,
    "estimationId"            TEXT,
    "clientId"                TEXT NOT NULL,
    "contactId"               TEXT,
    "title"                   TEXT NOT NULL,
    "currency"                TEXT NOT NULL DEFAULT 'TK',
    "contractValueSnapshot"   DECIMAL(12,2) NOT NULL,
    "orderValue"              DECIMAL(12,2) NOT NULL,
    "status"                  "ServiceSaleStatus" NOT NULL DEFAULT 'DRAFT',
    "fulfillmentStatus"       "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "orderDate"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate"           TIMESTAMP(3),
    "expectedStartDate"       TIMESTAMP(3),
    "expectedCompletionDate"  TIMESTAMP(3),
    "clientReference"         TEXT,
    "internalReference"       TEXT,
    "scopeSummary"            TEXT,
    "commercialSnapshotJson"  JSONB,
    "billingEligibleAt"       TIMESTAMP(3),
    "billingEligibleById"     TEXT,
    "handoverReadyAt"         TIMESTAMP(3),
    "handoverReadyById"       TEXT,
    "preparedById"            TEXT NOT NULL,
    "approvedById"            TEXT,
    "confirmedAt"             TIMESTAMP(3),
    "isTrash"                 BOOLEAN NOT NULL DEFAULT false,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceSale_organizationId_serviceSaleNumber_key" ON "ServiceSale"("organizationId","serviceSaleNumber");
CREATE INDEX IF NOT EXISTS "ServiceSale_organizationId_idx" ON "ServiceSale"("organizationId");
CREATE INDEX IF NOT EXISTS "ServiceSale_agreementId_idx" ON "ServiceSale"("agreementId");
CREATE INDEX IF NOT EXISTS "ServiceSale_clientId_idx" ON "ServiceSale"("clientId");
CREATE INDEX IF NOT EXISTS "ServiceSale_preparedById_idx" ON "ServiceSale"("preparedById");
CREATE INDEX IF NOT EXISTS "ServiceSale_status_idx" ON "ServiceSale"("status");
CREATE INDEX IF NOT EXISTS "ServiceSale_fulfillmentStatus_idx" ON "ServiceSale"("fulfillmentStatus");
CREATE INDEX IF NOT EXISTS "ServiceSale_isTrash_idx" ON "ServiceSale"("isTrash");

CREATE TABLE IF NOT EXISTS "ServiceSaleItem" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceSaleId"  TEXT NOT NULL,
    "code"           TEXT,
    "description"    TEXT NOT NULL,
    "quantity"       DECIMAL(10,2) NOT NULL,
    "unitPrice"      DECIMAL(12,2) NOT NULL,
    "amount"         DECIMAL(12,2) NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes"          TEXT,
    "sortOrder"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSaleItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ServiceSaleItem_organizationId_idx" ON "ServiceSaleItem"("organizationId");
CREATE INDEX IF NOT EXISTS "ServiceSaleItem_serviceSaleId_idx" ON "ServiceSaleItem"("serviceSaleId");

-- -----------------------------------------------------------------------
-- Phase 6: ProjectHandover Tables
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProjectHandover" (
    "id"                              TEXT NOT NULL,
    "organizationId"                  TEXT NOT NULL,
    "handoverNumber"                  TEXT NOT NULL,
    "serviceSaleId"                   TEXT NOT NULL,
    "agreementId"                     TEXT NOT NULL,
    "agreementVersionSnapshot"        INTEGER NOT NULL DEFAULT 1,
    "quotationId"                     TEXT,
    "opportunityId"                   TEXT,
    "requirementId"                   TEXT,
    "estimationId"                    TEXT,
    "clientId"                        TEXT NOT NULL,
    "contactId"                       TEXT,
    "sourceServiceSaleNumberSnapshot" TEXT NOT NULL,
    "sourceAgreementNumberSnapshot"   TEXT NOT NULL,
    "contractValueSnapshot"           DECIMAL(12,2) NOT NULL,
    "currency"                        TEXT NOT NULL DEFAULT 'TK',
    "commercialSnapshotJson"          JSONB,
    "deliveryScopeSummary"            TEXT,
    "clientExpectations"              TEXT,
    "exclusions"                      TEXT,
    "assumptions"                     TEXT,
    "deliveryNotes"                   TEXT,
    "technicalNotes"                  TEXT,
    "kickoffRequirements"             TEXT,
    "expectedStartDate"               TIMESTAMP(3),
    "expectedCompletionDate"          TIMESTAMP(3),
    "priority"                        TEXT NOT NULL DEFAULT 'NORMAL',
    "status"                          "ProjectHandoverStatus" NOT NULL DEFAULT 'DRAFT',
    "preparedById"                    TEXT NOT NULL,
    "proposedProjectManagerId"        TEXT,
    "acceptedById"                    TEXT,
    "acceptedAt"                      TIMESTAMP(3),
    "rejectionReason"                 TEXT,
    "projectId"                       TEXT,
    "isTrash"                         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"                       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHandover_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectHandover_organizationId_handoverNumber_key" ON "ProjectHandover"("organizationId","handoverNumber");
CREATE INDEX IF NOT EXISTS "ProjectHandover_organizationId_idx" ON "ProjectHandover"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_serviceSaleId_idx" ON "ProjectHandover"("serviceSaleId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_agreementId_idx" ON "ProjectHandover"("agreementId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_clientId_idx" ON "ProjectHandover"("clientId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_preparedById_idx" ON "ProjectHandover"("preparedById");
CREATE INDEX IF NOT EXISTS "ProjectHandover_proposedProjectManagerId_idx" ON "ProjectHandover"("proposedProjectManagerId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_projectId_idx" ON "ProjectHandover"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectHandover_status_idx" ON "ProjectHandover"("status");
CREATE INDEX IF NOT EXISTS "ProjectHandover_isTrash_idx" ON "ProjectHandover"("isTrash");

CREATE TABLE IF NOT EXISTS "ProjectHandoverItem" (
    "id"                      TEXT NOT NULL,
    "organizationId"          TEXT NOT NULL,
    "handoverId"              TEXT NOT NULL,
    "sourceServiceSaleItemId" TEXT,
    "code"                    TEXT,
    "description"             TEXT NOT NULL,
    "quantity"                DECIMAL(10,2) NOT NULL,
    "unitPrice"               DECIMAL(12,2),
    "amount"                  DECIMAL(12,2),
    "deliveryDescription"     TEXT,
    "acceptanceCriteria"      TEXT,
    "sortOrder"               INTEGER NOT NULL DEFAULT 0,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHandoverItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProjectHandoverItem_organizationId_idx" ON "ProjectHandoverItem"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectHandoverItem_handoverId_idx" ON "ProjectHandoverItem"("handoverId");

-- -----------------------------------------------------------------------
-- Phase 6: Foreign Key Constraints (Idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementSection" ADD CONSTRAINT "AgreementSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementSection" ADD CONSTRAINT "AgreementSection_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementPaymentSchedule" ADD CONSTRAINT "AgreementPaymentSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementPaymentSchedule" ADD CONSTRAINT "AgreementPaymentSchedule_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementSnapshotItem" ADD CONSTRAINT "AgreementSnapshotItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgreementSnapshotItem" ADD CONSTRAINT "AgreementSnapshotItem_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceSaleItem" ADD CONSTRAINT "ServiceSaleItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceSaleItem" ADD CONSTRAINT "ServiceSaleItem_serviceSaleId_fkey" FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_serviceSaleId_fkey" FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandoverItem" ADD CONSTRAINT "ProjectHandoverItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectHandoverItem" ADD CONSTRAINT "ProjectHandoverItem_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "ProjectHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------
-- Phase 16: Billing Milestones & Billability Enums
-- -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "BillingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'STALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingMilestoneType" AS ENUM ('FIXED_MILESTONE', 'FIXED_AMOUNT', 'PERCENTAGE_OF_CONTRACT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingMilestoneStatus" AS ENUM ('DRAFT', 'PENDING', 'BLOCKED', 'ELIGIBLE', 'BILLABLE', 'PARTIALLY_INVOICED', 'INVOICED', 'CANCELLED', 'STALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingConditionType" AS ENUM ('PROJECT_STARTED', 'PROJECT_COMPLETED', 'CREATIVE_COMPLETED', 'MARKETING_COMPLETED', 'DEVELOPMENT_COMPLETED', 'QA_COMPLETED', 'CENTRAL_APPROVAL_APPROVED', 'DATE_REACHED', 'MANUAL_INTERNAL_CONFIRMATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------
-- Phase 16: ProjectBillingPlan
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProjectBillingPlan" (
    "id"                      TEXT NOT NULL,
    "organizationId"          TEXT NOT NULL,
    "projectId"               TEXT NOT NULL,
    "agreementId"             TEXT,
    "serviceSaleId"           TEXT,
    "currency"                TEXT NOT NULL DEFAULT 'TK',
    "contractAmountSnapshot"  DECIMAL(12,2) NOT NULL,
    "status"                  "BillingPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById"             TEXT NOT NULL,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectBillingPlan_organizationId_idx" ON "ProjectBillingPlan"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectBillingPlan_projectId_idx"      ON "ProjectBillingPlan"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectBillingPlan_status_idx"         ON "ProjectBillingPlan"("status");

-- Partial Unique Index: at most one DRAFT or ACTIVE plan per project per org
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectBillingPlan_active_unique"
  ON "ProjectBillingPlan"("organizationId", "projectId")
  WHERE "status" IN ('DRAFT', 'ACTIVE');

-- -----------------------------------------------------------------------
-- Phase 16: ProjectBillingMilestone
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProjectBillingMilestone" (
    "id"               TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "billingPlanId"    TEXT NOT NULL,
    "projectId"        TEXT NOT NULL,
    "sequence"         INTEGER NOT NULL,
    "code"             TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "description"      TEXT,
    "billingType"      "BillingMilestoneType" NOT NULL DEFAULT 'FIXED_MILESTONE',
    "percentage"       DECIMAL(5,2),
    "fixedAmount"      DECIMAL(12,2),
    "calculatedAmount" DECIMAL(12,2) NOT NULL,
    "plannedDate"      TIMESTAMP(3),
    "dueDate"          TIMESTAMP(3),
    "status"           "BillingMilestoneStatus" NOT NULL DEFAULT 'DRAFT',
    "billableAt"       TIMESTAMP(3),
    "invoicedAt"       TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "cancelledAt"      TIMESTAMP(3),
    "staleAt"          TIMESTAMP(3),
    "staleReason"      TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBillingMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectBillingMilestone_organizationId_idx" ON "ProjectBillingMilestone"("organizationId");
CREATE INDEX IF NOT EXISTS "ProjectBillingMilestone_projectId_idx"       ON "ProjectBillingMilestone"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectBillingMilestone_status_idx"          ON "ProjectBillingMilestone"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectBillingMilestone_billingPlanId_sequence_key"
  ON "ProjectBillingMilestone"("billingPlanId", "sequence");

-- -----------------------------------------------------------------------
-- Phase 16: BillingMilestoneCondition
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BillingMilestoneCondition" (
    "id"                TEXT NOT NULL,
    "organizationId"    TEXT NOT NULL,
    "billingMilestoneId" TEXT NOT NULL,
    "conditionType"     "BillingConditionType" NOT NULL,
    "targetEntityId"    TEXT,
    "requiredDate"      TIMESTAMP(3),
    "satisfied"         BOOLEAN NOT NULL DEFAULT false,
    "satisfiedAt"       TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingMilestoneCondition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingMilestoneCondition_organizationId_idx"     ON "BillingMilestoneCondition"("organizationId");
CREATE INDEX IF NOT EXISTS "BillingMilestoneCondition_billingMilestoneId_idx" ON "BillingMilestoneCondition"("billingMilestoneId");
CREATE INDEX IF NOT EXISTS "BillingMilestoneCondition_conditionType_idx"       ON "BillingMilestoneCondition"("conditionType");

-- -----------------------------------------------------------------------
-- Phase 16: BillingMilestoneInvoiceLink
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BillingMilestoneInvoiceLink" (
    "id"                TEXT NOT NULL,
    "organizationId"    TEXT NOT NULL,
    "billingMilestoneId" TEXT NOT NULL,
    "invoiceId"         TEXT NOT NULL,
    "amountApplied"     DECIMAL(12,2) NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingMilestoneInvoiceLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingMilestoneInvoiceLink_organizationId_idx"     ON "BillingMilestoneInvoiceLink"("organizationId");
CREATE INDEX IF NOT EXISTS "BillingMilestoneInvoiceLink_billingMilestoneId_idx" ON "BillingMilestoneInvoiceLink"("billingMilestoneId");
CREATE INDEX IF NOT EXISTS "BillingMilestoneInvoiceLink_invoiceId_idx"          ON "BillingMilestoneInvoiceLink"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillingMilestoneInvoiceLink_billingMilestoneId_invoiceId_key"
  ON "BillingMilestoneInvoiceLink"("billingMilestoneId", "invoiceId");

-- -----------------------------------------------------------------------
-- Phase 16: Foreign Keys (ProjectBillingPlan & Milestones - Idempotent)
-- -----------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "ProjectBillingPlan" ADD CONSTRAINT "ProjectBillingPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingPlan" ADD CONSTRAINT "ProjectBillingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingPlan" ADD CONSTRAINT "ProjectBillingPlan_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingPlan" ADD CONSTRAINT "ProjectBillingPlan_serviceSaleId_fkey" FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingPlan" ADD CONSTRAINT "ProjectBillingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingMilestone" ADD CONSTRAINT "ProjectBillingMilestone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingMilestone" ADD CONSTRAINT "ProjectBillingMilestone_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "ProjectBillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ProjectBillingMilestone" ADD CONSTRAINT "ProjectBillingMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingMilestoneCondition" ADD CONSTRAINT "BillingMilestoneCondition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingMilestoneCondition" ADD CONSTRAINT "BillingMilestoneCondition_billingMilestoneId_fkey" FOREIGN KEY ("billingMilestoneId") REFERENCES "ProjectBillingMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingMilestoneInvoiceLink" ADD CONSTRAINT "BillingMilestoneInvoiceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingMilestoneInvoiceLink" ADD CONSTRAINT "BillingMilestoneInvoiceLink_billingMilestoneId_fkey" FOREIGN KEY ("billingMilestoneId") REFERENCES "ProjectBillingMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BillingMilestoneInvoiceLink" ADD CONSTRAINT "BillingMilestoneInvoiceLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
