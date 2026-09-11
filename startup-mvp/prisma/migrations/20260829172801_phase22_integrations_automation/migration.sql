/*
  Warnings:

  - The values [SUCCESS,CANCELLED] on the enum `BuildStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [IN_REVIEW] on the enum `CodeReviewStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DIRECT_EXPENSE,OVERHEAD,INDIRECT,OTHER] on the enum `CostCategory` will be removed. If these variants are still used in the database, this will fail.
  - The values [IN_REVIEW,APPROVED,ARCHIVED] on the enum `DevelopmentPlanStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [TESTING,BLOCKED] on the enum `DevelopmentWorkstreamStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [QA_AUTOMATION] on the enum `DevelopmentWorkstreamType` will be removed. If these variants are still used in the database, this will fail.
  - The values [CRITICAL] on the enum `ProfitabilityStatus` will be removed. If these variants are still used in the database, this will fail.
  - The `address` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `creativeWorkRequirement` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marketingWorkRequirement` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `developmentWorkRequirement` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `description` on the `ProjectDevelopmentPlan` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `lastRunAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `nextRunAt` on the `Task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[deviceUserId]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[externalId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Made the column `organizationId` on table `Client` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Contact` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `organizationId` to the `File` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `Issue` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `organizationId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Opportunity` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Quotation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Task` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `Voucher` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmploymentType') THEN CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'CONTRACT', 'INTERN', 'DAILY_WORKER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceStatus') THEN CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY', 'HOLIDAY', 'WEEKEND'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaveCategory') THEN CREATE TYPE "LeaveCategory" AS ENUM ('CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'UNPAID', 'OTHER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaveStatus') THEN CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'HR_APPROVED', 'REJECTED', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayrollStatus') THEN CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'POSTED', 'PAID'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LoanStatus') THEN CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceSource') THEN CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'WEB', 'MOBILE', 'BIOMETRIC', 'API'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequirementStatus') THEN CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'DISCOVERY', 'WAITING_CLIENT', 'READY_FOR_REVIEW', 'CONFIRMED', 'READY_FOR_ESTIMATION', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequirementPriority') THEN CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequirementItemType') THEN CREATE TYPE "RequirementItemType" AS ENUM ('FEATURE', 'INTEGRATION', 'REPORT', 'MOBILE', 'WEB', 'INFRASTRUCTURE', 'MIGRATION', 'TRAINING', 'SUPPORT', 'OTHER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClarificationStatus') THEN CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstimationStatus') THEN CREATE TYPE "EstimationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'READY_FOR_QUOTATION', 'REJECTED', 'SUPERSEDED', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CostingMethod') THEN CREATE TYPE "CostingMethod" AS ENUM ('HOURLY', 'FIXED', 'QUANTITY', 'DAILY', 'MONTHLY', 'MILESTONE', 'VENDOR_COST', 'OTHER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreativeRequirementStatus') THEN CREATE TYPE "CreativeRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'APPROVED', 'COMPLETED', 'BLOCKED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreativeBriefStatus') THEN CREATE TYPE "CreativeBriefStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreativeDeliverableType') THEN CREATE TYPE "CreativeDeliverableType" AS ENUM ('LOGO', 'BRAND_GUIDELINE', 'LANDING_PAGE_UI', 'DASHBOARD_UI', 'MOBILE_APP_UI', 'SOCIAL_MEDIA_ARTWORK', 'BANNER', 'WIREFRAME', 'PROTOTYPE', 'OTHER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreativeDeliverableStatus') THEN CREATE TYPE "CreativeDeliverableStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'COMPLETED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreativeReviewStatus') THEN CREATE TYPE "CreativeReviewStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingRequirementStatus') THEN CREATE TYPE "MarketingRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingCampaignType') THEN CREATE TYPE "MarketingCampaignType" AS ENUM ('DIGITAL_MARKETING', 'SEO', 'SEM', 'SOCIAL_MEDIA', 'CONTENT_MARKETING', 'EMAIL_CAMPAIGN', 'PAID_ADS', 'OTHER'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingCampaignStatus') THEN CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'PLANNED', 'READY', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingContentStatus') THEN CREATE TYPE "MarketingContentStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevelopmentRequirementStatus') THEN CREATE TYPE "DevelopmentRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED'); END IF; END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "BuildStatus_new" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');
ALTER TABLE "public"."DevelopmentBuildRecord" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DevelopmentBuildRecord" ALTER COLUMN "status" TYPE "BuildStatus_new" USING ("status"::text::"BuildStatus_new");
ALTER TYPE "BuildStatus" RENAME TO "BuildStatus_old";
ALTER TYPE "BuildStatus_new" RENAME TO "BuildStatus";
DROP TYPE "public"."BuildStatus_old";
ALTER TABLE "DevelopmentBuildRecord" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CodeReviewStatus_new" AS ENUM ('NOT_REQUIRED', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED');
ALTER TABLE "public"."DevelopmentTechnicalDeliverable" ALTER COLUMN "codeReviewStatus" DROP DEFAULT;
ALTER TABLE "public"."ProjectDevelopmentWorkstream" ALTER COLUMN "codeReviewStatus" DROP DEFAULT;
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "codeReviewStatus" TYPE "CodeReviewStatus_new" USING ("codeReviewStatus"::text::"CodeReviewStatus_new");
ALTER TABLE "DevelopmentTechnicalDeliverable" ALTER COLUMN "codeReviewStatus" TYPE "CodeReviewStatus_new" USING ("codeReviewStatus"::text::"CodeReviewStatus_new");
ALTER TYPE "CodeReviewStatus" RENAME TO "CodeReviewStatus_old";
ALTER TYPE "CodeReviewStatus_new" RENAME TO "CodeReviewStatus";
DROP TYPE "public"."CodeReviewStatus_old";
ALTER TABLE "DevelopmentTechnicalDeliverable" ALTER COLUMN "codeReviewStatus" SET DEFAULT 'NOT_REQUIRED';
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "codeReviewStatus" SET DEFAULT 'NOT_REQUIRED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CostCategory_new" AS ENUM ('LABOR', 'PROCUREMENT', 'EXPENSE', 'SUBCONTRACTOR', 'INFRASTRUCTURE', 'OTHER_DIRECT');
ALTER TABLE "ProjectCostAllocation" ALTER COLUMN "category" TYPE "CostCategory_new" USING ("category"::text::"CostCategory_new");
ALTER TYPE "CostCategory" RENAME TO "CostCategory_old";
ALTER TYPE "CostCategory_new" RENAME TO "CostCategory";
DROP TYPE "public"."CostCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DevelopmentPlanStatus_new" AS ENUM ('DRAFT', 'PLANNED', 'READY', 'ACTIVE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."ProjectDevelopmentPlan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectDevelopmentPlan" ALTER COLUMN "status" TYPE "DevelopmentPlanStatus_new" USING ("status"::text::"DevelopmentPlanStatus_new");
ALTER TYPE "DevelopmentPlanStatus" RENAME TO "DevelopmentPlanStatus_old";
ALTER TYPE "DevelopmentPlanStatus_new" RENAME TO "DevelopmentPlanStatus";
DROP TYPE "public"."DevelopmentPlanStatus_old";
ALTER TABLE "ProjectDevelopmentPlan" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DevelopmentWorkstreamStatus_new" AS ENUM ('DRAFT', 'PLANNED', 'READY', 'IN_PROGRESS', 'CODE_REVIEW', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."ProjectDevelopmentWorkstream" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "status" TYPE "DevelopmentWorkstreamStatus_new" USING ("status"::text::"DevelopmentWorkstreamStatus_new");
ALTER TYPE "DevelopmentWorkstreamStatus" RENAME TO "DevelopmentWorkstreamStatus_old";
ALTER TYPE "DevelopmentWorkstreamStatus_new" RENAME TO "DevelopmentWorkstreamStatus";
DROP TYPE "public"."DevelopmentWorkstreamStatus_old";
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DevelopmentWorkstreamType_new" AS ENUM ('FRONTEND', 'BACKEND', 'MOBILE', 'API', 'DATABASE', 'INTEGRATION', 'DEVOPS', 'OTHER');
ALTER TABLE "public"."ProjectDevelopmentWorkstream" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "type" TYPE "DevelopmentWorkstreamType_new" USING ("type"::text::"DevelopmentWorkstreamType_new");
ALTER TYPE "DevelopmentWorkstreamType" RENAME TO "DevelopmentWorkstreamType_old";
ALTER TYPE "DevelopmentWorkstreamType_new" RENAME TO "DevelopmentWorkstreamType";
DROP TYPE "public"."DevelopmentWorkstreamType_old";
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "type" SET DEFAULT 'BACKEND';
COMMIT;

-- AlterEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'OpportunityStage' AND pg_enum.enumlabel = 'UNQUALIFIED') THEN ALTER TYPE "OpportunityStage" ADD VALUE 'UNQUALIFIED'; END IF; END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "ProfitabilityStatus_new" AS ENUM ('HEALTHY', 'AT_RISK', 'LOSS_MAKING', 'NOT_ENOUGH_DATA');
ALTER TABLE "public"."ProjectProfitabilitySnapshot" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectProfitabilitySnapshot" ALTER COLUMN "status" TYPE "ProfitabilityStatus_new" USING ("status"::text::"ProfitabilityStatus_new");
ALTER TYPE "ProfitabilityStatus" RENAME TO "ProfitabilityStatus_old";
ALTER TYPE "ProfitabilityStatus_new" RENAME TO "ProfitabilityStatus";
DROP TYPE "public"."ProfitabilityStatus_old";
ALTER TABLE "ProjectProfitabilitySnapshot" ALTER COLUMN "status" SET DEFAULT 'NOT_ENOUGH_DATA';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'ProjectStatus' AND pg_enum.enumlabel = 'DRAFT') THEN ALTER TYPE "ProjectStatus" ADD VALUE 'DRAFT'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'ProjectStatus' AND pg_enum.enumlabel = 'ARCHIVED') THEN ALTER TYPE "ProjectStatus" ADD VALUE 'ARCHIVED'; END IF; END $$;

-- AlterEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'SectionType' AND pg_enum.enumlabel = 'PAYMENT_TERMS') THEN ALTER TYPE "SectionType" ADD VALUE 'PAYMENT_TERMS'; END IF; END $$;

-- AlterEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'VoucherType' AND pg_enum.enumlabel = 'RETURN') THEN ALTER TYPE "VoucherType" ADD VALUE 'RETURN'; END IF; END $$;

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_quotationId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_quotationItemId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_organizationId_fkey";

-- DropIndex
DROP INDEX "ProjectProfitabilitySnapshot_status_idx";

-- AlterTable
ALTER TABLE "ApprovalPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApprovalPolicyStep" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApprovalRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ApprovalStepInstance" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Data Backfill for organizationId
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'organizationId') THEN
    UPDATE "Client" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Contact' AND column_name = 'organizationId') THEN
    UPDATE "Contact" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Employee' AND column_name = 'organizationId') THEN
    UPDATE "Employee" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Issue' AND column_name = 'organizationId') THEN
    UPDATE "Issue" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'organizationId') THEN
    UPDATE "Order" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Project' AND column_name = 'organizationId') THEN
    UPDATE "Project" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Quotation' AND column_name = 'organizationId') THEN
    UPDATE "Quotation" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'organizationId') THEN
    UPDATE "Task" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Voucher' AND column_name = 'organizationId') THEN
    UPDATE "Voucher" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "organizationId" SET NOT NULL;


-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DevelopmentTechnicalDeliverable" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "departmentId" TEXT,
ADD COLUMN IF NOT EXISTS     "deviceUserId" TEXT,
ADD COLUMN IF NOT EXISTS     "emergencyContact" JSONB,
ADD COLUMN IF NOT EXISTS     "employmentType" "EmploymentType" DEFAULT 'PERMANENT',
ADD COLUMN IF NOT EXISTS     "fingerprintDeviceId" TEXT,
ADD COLUMN IF NOT EXISTS     "gender" TEXT,
ADD COLUMN IF NOT EXISTS     "joiningDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "nationalId" TEXT,
ADD COLUMN IF NOT EXISTS     "photo" TEXT,
ADD COLUMN IF NOT EXISTS     "reportingManagerId" TEXT,
ADD COLUMN IF NOT EXISTS     "shiftId" TEXT,
ADD COLUMN IF NOT EXISTS     "teamId" TEXT,
ADD COLUMN IF NOT EXISTS     "utilizationTarget" DOUBLE PRECISION DEFAULT 80.0,
ADD COLUMN IF NOT EXISTS     "warehouseId" TEXT,
ALTER COLUMN "organizationId" SET NOT NULL,
DROP COLUMN IF EXISTS "address",
ADD COLUMN IF NOT EXISTS     "address" JSONB;

-- AlterTable
ALTER TABLE "File" ADD COLUMN IF NOT EXISTS     "organizationId" TEXT NOT NULL DEFAULT 'default-org';

-- AlterTable
ALTER TABLE "Holiday" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Issue" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS     "alternativePhone" TEXT,
ADD COLUMN IF NOT EXISTS     "categoryId" TEXT,
ADD COLUMN IF NOT EXISTS     "closingReason" TEXT,
ADD COLUMN IF NOT EXISTS     "externalId" TEXT,
ADD COLUMN IF NOT EXISTS     "formId" TEXT,
ADD COLUMN IF NOT EXISTS     "location" TEXT,
ADD COLUMN IF NOT EXISTS     "messageText" TEXT,
ADD COLUMN IF NOT EXISTS     "organizationId" TEXT NOT NULL DEFAULT 'default-org',
ADD COLUMN IF NOT EXISTS     "pageId" TEXT,
ADD COLUMN IF NOT EXISTS     "photo" TEXT,
ADD COLUMN IF NOT EXISTS     "rawPayload" JSONB,
ADD COLUMN IF NOT EXISTS     "reference" TEXT,
ADD COLUMN IF NOT EXISTS     "startingDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS     "departmentId" TEXT,
ADD COLUMN IF NOT EXISTS     "startDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "teamId" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS     "closingReason" TEXT,
ADD COLUMN IF NOT EXISTS     "leadId" TEXT,
ADD COLUMN IF NOT EXISTS     "organizationId" TEXT NOT NULL DEFAULT 'default-org';


-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "quotationId" DROP NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "quotationItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL,
DROP COLUMN IF EXISTS "creativeWorkRequirement",
ADD COLUMN IF NOT EXISTS     "creativeWorkRequirement" "CreativeRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
DROP COLUMN IF EXISTS "marketingWorkRequirement",
ADD COLUMN IF NOT EXISTS     "marketingWorkRequirement" "MarketingRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
DROP COLUMN IF EXISTS "developmentWorkRequirement",
ADD COLUMN IF NOT EXISTS     "developmentWorkRequirement" "DevelopmentRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "ProjectCostAllocation" ALTER COLUMN "allocationMethod" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDepartmentDependency" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDevelopmentPlan" DROP COLUMN IF EXISTS "description",
ADD COLUMN IF NOT EXISTS     "apiRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS     "backendRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS     "databaseRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS     "environmentNotes" TEXT,
ADD COLUMN IF NOT EXISTS     "frontendRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS     "integrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS     "mobileRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS     "repositoryName" TEXT,
ADD COLUMN IF NOT EXISTS     "repositoryProvider" TEXT,
ADD COLUMN IF NOT EXISTS     "technicalScope" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDevelopmentWorkstream" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectProfitabilitySnapshot" ALTER COLUMN "contractValue" DROP DEFAULT,
ALTER COLUMN "billableAmount" DROP DEFAULT,
ALTER COLUMN "invoicedAmount" DROP DEFAULT,
ALTER COLUMN "recognizedRevenue" DROP DEFAULT,
ALTER COLUMN "collectedAmount" DROP DEFAULT,
ALTER COLUMN "actualLaborCost" DROP DEFAULT,
ALTER COLUMN "actualDirectCost" DROP DEFAULT,
ALTER COLUMN "totalActualCost" DROP DEFAULT,
ALTER COLUMN "committedCost" DROP DEFAULT,
ALTER COLUMN "projectedRemainingCost" DROP DEFAULT,
ALTER COLUMN "projectedFinalCost" DROP DEFAULT,
ALTER COLUMN "grossProfit" DROP DEFAULT,
ALTER COLUMN "projectedProfit" DROP DEFAULT,
ALTER COLUMN "grossMarginPercent" DROP DEFAULT,
ALTER COLUMN "projectedMarginPercent" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectQAPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectQATestCycle" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "organizationId";

-- AlterTable
ALTER TABLE "QATestCase" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quotation" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "organizationId";

-- AlterTable
ALTER TABLE "SupportEntitlement" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportSLAPolicy" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicket" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicketComment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicketSLA" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SupportTicketSequence" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN IF EXISTS "lastRunAt",
DROP COLUMN IF EXISTS "nextRunAt",
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS     "defaultWarehouseId" TEXT,
ADD COLUMN IF NOT EXISTS     "organizationId" TEXT,
ADD COLUMN IF NOT EXISTS     "salary" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Voucher" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "VoucherLine" ADD COLUMN IF NOT EXISTS     "projectId" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS     "organization_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "managerEmployeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "leadEmployeeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaskDependency" (
    "id" TEXT NOT NULL,
    "blockingTaskId" TEXT NOT NULL,
    "dependentTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaskWatcher" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MilestoneDependency" (
    "id" TEXT NOT NULL,
    "blockingId" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Timesheet" (
    "organizationId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "issueId" TEXT,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'PENDING',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "taskId" TEXT,
    "approvedById" TEXT,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateAfter" INTEGER NOT NULL DEFAULT 15,
    "halfDayAfter" INTEGER NOT NULL DEFAULT 120,
    "otStartAfter" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LeaveCategory" NOT NULL,
    "defaultDays" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveApplication" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "managerId" TEXT,
    "hrId" TEXT,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AttendanceLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftId" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "workHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "otHours" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "leaveApplicationId" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Overtime" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "ratePerHour" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Overtime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeLoan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "monthlyInstallment" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "issueDate" DATE NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "purpose" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "voucherId" TEXT,
    "approvedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeSalary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "houseRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transport" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pfPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payroll" (
    "organizationId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "payrollNumber" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "dateGenerated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voucherId" TEXT,
    "paymentVchId" TEXT,
    "notes" TEXT,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basic" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "houseRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "medical" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transport" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "absentDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loanDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pfDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BiometricSyncLog" (
    "id" TEXT NOT NULL,
    "syncTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendor" TEXT NOT NULL,
    "deviceId" TEXT,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "syncedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BiometricSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BiometricDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL DEFAULT 'IP',
    "ipAddress" TEXT,
    "port" INTEGER DEFAULT 4370,
    "apiKey" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "protocol" TEXT DEFAULT 'TCP_IP',
    "company" TEXT,
    "branchId" TEXT,
    "timeZone" TEXT DEFAULT 'Asia/Dhaka',
    "connectionStatus" TEXT DEFAULT 'unknown',
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectBudget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Checklist" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Checklist',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "taskId" TEXT,
    "issueId" TEXT,
    "milestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ActivityReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "comments" TEXT,
    "completed" TEXT,
    "pending" TEXT,
    "blocked" TEXT,
    "newWork" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalActiveMs" INTEGER NOT NULL DEFAULT 0,
    "totalBreakMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkSessionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT,
    "projectId" TEXT,

    CONSTRAINT "WorkSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MyDayTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taskId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MyDayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Requirement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requirementNumber" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "businessObjective" TEXT,
    "scopeOverview" TEXT,
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT,
    "requestedStartDate" TIMESTAMP(3),
    "targetDeliveryDate" TIMESTAMP(3),
    "budgetExpectation" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'TK',
    "ownerId" TEXT NOT NULL,
    "preparedById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "readyForEstimationAt" TIMESTAMP(3),
    "readyForEstimationById" TEXT,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequirementSection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequirementItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "sectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RequirementItemType" NOT NULL DEFAULT 'FEATURE',
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "acceptanceCriteria" TEXT,
    "clientNotes" TEXT,
    "internalNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RequirementClarification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "ClarificationStatus" NOT NULL DEFAULT 'OPEN',
    "askedById" TEXT NOT NULL,
    "answeredById" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementClarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Estimation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimationNumber" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EstimationStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'TK',
    "baseInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contingencyPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "contingencyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "targetMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "recommendedPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priceOverride" DECIMAL(12,2),
    "minimumPrice" DECIMAL(12,2),
    "projectedProfit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "projectedMarginPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assumptions" TEXT,
    "riskNotes" TEXT,
    "preparedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "readyForQuotationAt" TIMESTAMP(3),
    "readyForQuotationById" TEXT,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EstimationSection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EstimationItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimationId" TEXT NOT NULL,
    "sectionId" TEXT,
    "requirementItemId" TEXT,
    "departmentId" TEXT,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costingMethod" "CostingMethod" NOT NULL DEFAULT 'HOURLY',
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Hours',
    "estimatedHours" DECIMAL(10,2),
    "internalRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "internalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commercialRate" DECIMAL(10,2),
    "recommendedPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectResourceAllocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT,
    "teamId" TEXT,
    "allocationStartDate" TIMESTAMP(3) NOT NULL,
    "allocationEndDate" TIMESTAMP(3) NOT NULL,
    "allocationPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "plannedHours" DOUBLE PRECISION,
    "projectRole" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectResourceAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectCreativeBrief" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "briefNumber" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "targetAudience" TEXT,
    "brandGuidelines" TEXT,
    "styleDirection" TEXT,
    "references" TEXT,
    "requiredDeliverables" TEXT,
    "dimensionsPlatforms" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "CreativeBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCreativeBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectCreativeDeliverable" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creativeBriefId" TEXT,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "deliverableType" "CreativeDeliverableType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "status" "CreativeDeliverableStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedEmployeeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "internalReviewStatus" "CreativeReviewStatus" NOT NULL DEFAULT 'PENDING',
    "clientReviewStatus" "CreativeReviewStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "approvedVersionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCreativeDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CreativeDeliverableVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileId" TEXT,
    "previewUrl" TEXT,
    "attachmentUrl" TEXT,
    "submittedById" TEXT NOT NULL,
    "changeSummary" TEXT,
    "internalReviewStatus" "CreativeReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
    "clientReviewStatus" "CreativeReviewStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeDeliverableVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectMarketingPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "targetAudience" TEXT,
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "geography" TEXT,
    "campaignStartDate" TIMESTAMP(3),
    "campaignEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMarketingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectMarketingCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "marketingPlanId" TEXT,
    "name" TEXT NOT NULL,
    "campaignType" "MarketingCampaignType" NOT NULL DEFAULT 'DIGITAL_MARKETING',
    "channel" TEXT,
    "objective" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedEmployeeId" TEXT,
    "taskId" TEXT,
    "creativeDeliverableId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketingContentItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'SOCIAL_POST',
    "channel" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "MarketingContentStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedEmployeeId" TEXT,
    "clientReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketingPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "reach" INTEGER,
    "clicks" INTEGER,
    "leads" INTEGER,
    "conversions" INTEGER,
    "adSpend" DECIMAL(12,2),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "authenticationType" TEXT NOT NULL,
    "encryptedCredentials" TEXT,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "lastConnectedAt" TIMESTAMP(3),
    "lastSuccessfulAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subscribedEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBodySummary" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "requestHeaders" JSONB,
    "requestBody" TEXT,
    "responseHeaders" JSONB,
    "responseBody" TEXT,
    "responseStatus" INTEGER,
    "durationMs" INTEGER,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorSummary" TEXT,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AutomationRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actionType" TEXT NOT NULL,
    "actionConfig" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AutomationExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationRuleId" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "triggerEventId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "outputSummary" TEXT,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DomainOutboxEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),

    CONSTRAINT "DomainOutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QueueJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_ProjectTeamMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectTeamMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_MilestoneToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_IssueToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IssueToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_TagToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagToTask_AB_pkey" PRIMARY KEY ("A","B")
);


-- Ensure organizationId on newly created or existing tables
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Requirement" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "RequirementSection" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "RequirementItem" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "RequirementClarification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "Estimation" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "EstimationSection" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "EstimationItem" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ProjectResourceAllocation" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ProjectCreativeBrief" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ProjectCreativeDeliverable" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "CreativeDeliverableVersion" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ProjectMarketingPlan" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "ProjectMarketingCampaign" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "MarketingContentItem" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "MarketingPerformanceSnapshot" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "WebhookEndpoint" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "WebhookDeliveryAttempt" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "IntegrationEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "AutomationExecution" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "DomainOutboxEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';
ALTER TABLE "QueueJob" ADD COLUMN IF NOT EXISTS "organizationId" TEXT NOT NULL DEFAULT 'default-org';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Department_organizationId_status_idx" ON "Department"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Department_managerEmployeeId_idx" ON "Department"("managerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Department_organizationId_code_key" ON "Department"("organizationId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_departmentId_idx" ON "Team"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_organizationId_departmentId_idx" ON "Team"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Team_leadEmployeeId_idx" ON "Team"("leadEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Team_organizationId_departmentId_code_key" ON "Team"("organizationId", "departmentId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskDependency_dependentTaskId_idx" ON "TaskDependency"("dependentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TaskDependency_blockingTaskId_dependentTaskId_key" ON "TaskDependency"("blockingTaskId", "dependentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TaskWatcher_taskId_userId_key" ON "TaskWatcher"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MilestoneDependency_blockingId_dependentId_key" ON "MilestoneDependency"("blockingId", "dependentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_projectId_idx" ON "Timesheet"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_employeeId_idx" ON "Timesheet"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_issueId_idx" ON "Timesheet"("issueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_taskId_idx" ON "Timesheet"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_date_idx" ON "Timesheet"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_projectId_taskId_idx" ON "Timesheet"("projectId", "taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_employeeId_date_idx" ON "Timesheet"("employeeId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_organizationId_idx" ON "Timesheet"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shift_isTrash_idx" ON "Shift"("isTrash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Shift_createdBy_idx" ON "Shift"("createdBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApplication_employeeId_idx" ON "LeaveApplication"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApplication_status_idx" ON "LeaveApplication"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApplication_startDate_endDate_idx" ON "LeaveApplication"("startDate", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApplication_managerId_idx" ON "LeaveApplication"("managerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveApplication_hrId_idx" ON "LeaveApplication"("hrId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceLog_employeeId_idx" ON "AttendanceLog"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AttendanceLog_timestamp_idx" ON "AttendanceLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceLog_employeeId_timestamp_key" ON "AttendanceLog"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attendance_employeeId_date_idx" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attendance_isLocked_idx" ON "Attendance"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Overtime_employeeId_idx" ON "Overtime"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Overtime_date_idx" ON "Overtime"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Overtime_status_idx" ON "Overtime"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeLoan_employeeId_idx" ON "EmployeeLoan"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeLoan_status_idx" ON "EmployeeLoan"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeLoan_voucherId_idx" ON "EmployeeLoan"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSalary_employeeId_key" ON "EmployeeSalary"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payroll_payrollNumber_key" ON "Payroll"("payrollNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payroll_voucherId_key" ON "Payroll"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payroll_paymentVchId_key" ON "Payroll"("paymentVchId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payroll_month_year_idx" ON "Payroll"("month", "year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payroll_voucherId_idx" ON "Payroll"("voucherId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payroll_month_year_status_idx" ON "Payroll"("month", "year", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payroll_organizationId_idx" ON "Payroll"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollItem_status_idx" ON "PayrollItem"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrollItem_employeeId_status_idx" ON "PayrollItem"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollItem_payrollId_employeeId_key" ON "PayrollItem"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricSyncLog_syncTime_idx" ON "BiometricSyncLog"("syncTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricSyncLog_vendor_idx" ON "BiometricSyncLog"("vendor");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BiometricDevice_serialNumber_key" ON "BiometricDevice"("serialNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricDevice_vendor_idx" ON "BiometricDevice"("vendor");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BiometricDevice_status_idx" ON "BiometricDevice"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectBudget_projectId_idx" ON "ProjectBudget"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivityReport_userId_idx" ON "ActivityReport"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActivityReport_reportDate_idx" ON "ActivityReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActivityReport_userId_reportDate_key" ON "ActivityReport"("userId", "reportDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSession_userId_idx" ON "WorkSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSession_date_idx" ON "WorkSession"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkSessionLog_sessionId_idx" ON "WorkSessionLog"("sessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MyDayTask_userId_date_idx" ON "MyDayTask"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MyDayTask_userId_date_taskId_key" ON "MyDayTask"("userId", "date", "taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_organizationId_idx" ON "Requirement"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_opportunityId_idx" ON "Requirement"("opportunityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_clientId_idx" ON "Requirement"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_ownerId_idx" ON "Requirement"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_status_idx" ON "Requirement"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_priority_idx" ON "Requirement"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Requirement_isTrash_idx" ON "Requirement"("isTrash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Requirement_organizationId_requirementNumber_key" ON "Requirement"("organizationId", "requirementNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementSection_organizationId_idx" ON "RequirementSection"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementSection_requirementId_idx" ON "RequirementSection"("requirementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementItem_organizationId_idx" ON "RequirementItem"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementItem_requirementId_idx" ON "RequirementItem"("requirementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementItem_sectionId_idx" ON "RequirementItem"("sectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementItem_isTrash_idx" ON "RequirementItem"("isTrash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementClarification_organizationId_idx" ON "RequirementClarification"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementClarification_requirementId_idx" ON "RequirementClarification"("requirementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RequirementClarification_status_idx" ON "RequirementClarification"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_organizationId_idx" ON "Estimation"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_requirementId_idx" ON "Estimation"("requirementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_opportunityId_idx" ON "Estimation"("opportunityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_clientId_idx" ON "Estimation"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_preparedById_idx" ON "Estimation"("preparedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_status_idx" ON "Estimation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Estimation_isTrash_idx" ON "Estimation"("isTrash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Estimation_organizationId_estimationNumber_key" ON "Estimation"("organizationId", "estimationNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Estimation_organizationId_requirementId_version_key" ON "Estimation"("organizationId", "requirementId", "version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationSection_organizationId_idx" ON "EstimationSection"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationSection_estimationId_idx" ON "EstimationSection"("estimationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_organizationId_idx" ON "EstimationItem"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_estimationId_idx" ON "EstimationItem"("estimationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_sectionId_idx" ON "EstimationItem"("sectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_requirementItemId_idx" ON "EstimationItem"("requirementItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_departmentId_idx" ON "EstimationItem"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimationItem_teamId_idx" ON "EstimationItem"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectResourceAllocation_organizationId_idx" ON "ProjectResourceAllocation"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectResourceAllocation_projectId_idx" ON "ProjectResourceAllocation"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectResourceAllocation_employeeId_idx" ON "ProjectResourceAllocation"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectResourceAllocation_status_idx" ON "ProjectResourceAllocation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectResourceAllocation_allocationStartDate_allocationEnd_idx" ON "ProjectResourceAllocation"("allocationStartDate", "allocationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCreativeBrief_briefNumber_key" ON "ProjectCreativeBrief"("briefNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeBrief_organizationId_idx" ON "ProjectCreativeBrief"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeBrief_projectId_idx" ON "ProjectCreativeBrief"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeBrief_status_idx" ON "ProjectCreativeBrief"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeBrief_briefNumber_idx" ON "ProjectCreativeBrief"("briefNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_approvedVersionId_key" ON "ProjectCreativeDeliverable"("approvedVersionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_organizationId_idx" ON "ProjectCreativeDeliverable"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_projectId_idx" ON "ProjectCreativeDeliverable"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_creativeBriefId_idx" ON "ProjectCreativeDeliverable"("creativeBriefId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_taskId_idx" ON "ProjectCreativeDeliverable"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_assignedEmployeeId_idx" ON "ProjectCreativeDeliverable"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_status_idx" ON "ProjectCreativeDeliverable"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreativeDeliverableVersion_organizationId_idx" ON "CreativeDeliverableVersion"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreativeDeliverableVersion_deliverableId_idx" ON "CreativeDeliverableVersion"("deliverableId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CreativeDeliverableVersion_submittedById_idx" ON "CreativeDeliverableVersion"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CreativeDeliverableVersion_deliverableId_versionNumber_key" ON "CreativeDeliverableVersion"("deliverableId", "versionNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingPlan_organizationId_idx" ON "ProjectMarketingPlan"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingPlan_projectId_idx" ON "ProjectMarketingPlan"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingPlan_status_idx" ON "ProjectMarketingPlan"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingCampaign_organizationId_idx" ON "ProjectMarketingCampaign"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingCampaign_projectId_idx" ON "ProjectMarketingCampaign"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingCampaign_marketingPlanId_idx" ON "ProjectMarketingCampaign"("marketingPlanId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingCampaign_assignedEmployeeId_idx" ON "ProjectMarketingCampaign"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectMarketingCampaign_status_idx" ON "ProjectMarketingCampaign"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingContentItem_organizationId_idx" ON "MarketingContentItem"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingContentItem_campaignId_idx" ON "MarketingContentItem"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingContentItem_status_idx" ON "MarketingContentItem"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingPerformanceSnapshot_organizationId_idx" ON "MarketingPerformanceSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingPerformanceSnapshot_campaignId_idx" ON "MarketingPerformanceSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingPerformanceSnapshot_snapshotDate_idx" ON "MarketingPerformanceSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationConnection_organizationId_idx" ON "IntegrationConnection"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEndpoint_status_idx" ON "WebhookEndpoint"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDelivery_organizationId_idx" ON "WebhookDelivery"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDelivery_eventId_idx" ON "WebhookDelivery"("eventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDeliveryAttempt_organizationId_idx" ON "WebhookDeliveryAttempt"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookDeliveryAttempt_deliveryId_idx" ON "WebhookDeliveryAttempt"("deliveryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationEvent_organizationId_idx" ON "IntegrationEvent"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationEvent_connectionId_idx" ON "IntegrationEvent"("connectionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationEvent_status_idx" ON "IntegrationEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationEvent_organizationId_connectionId_externalEventI_key" ON "IntegrationEvent"("organizationId", "connectionId", "externalEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationRule_organizationId_idx" ON "AutomationRule"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationRule_status_idx" ON "AutomationRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AutomationExecution_idempotencyKey_key" ON "AutomationExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationExecution_organizationId_idx" ON "AutomationExecution"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationExecution_automationRuleId_idx" ON "AutomationExecution"("automationRuleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AutomationExecution_status_idx" ON "AutomationExecution"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DomainOutboxEvent_organizationId_idx" ON "DomainOutboxEvent"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DomainOutboxEvent_publishedAt_idx" ON "DomainOutboxEvent"("publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DomainOutboxEvent_nextAttemptAt_idx" ON "DomainOutboxEvent"("nextAttemptAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueueJob_organizationId_idx" ON "QueueJob"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueueJob_status_idx" ON "QueueJob"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueueJob_availableAt_idx" ON "QueueJob"("availableAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueueJob_claimedBy_idx" ON "QueueJob"("claimedBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_ProjectTeamMembers_B_index" ON "_ProjectTeamMembers"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_MilestoneToTag_B_index" ON "_MilestoneToTag"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_IssueToTag_B_index" ON "_IssueToTag"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_TagToTask_B_index" ON "_TagToTask"("B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_type_createdAt_idx" ON "Activity"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agreement_preparedById_idx" ON "Agreement"("preparedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agreement_isTrash_idx" ON "Agreement"("isTrash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChartOfAccount_organizationId_idx" ON "ChartOfAccount"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_deviceUserId_key" ON "Employee"("deviceUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Employee_warehouseId_idx" ON "Employee"("warehouseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "File_organizationId_idx" ON "File"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Holiday_warehouseId_idx" ON "Holiday"("warehouseId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Holiday_organizationId_idx" ON "Holiday"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Holiday_createdBy_idx" ON "Holiday"("createdBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_organizationId_idx" ON "Issue"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JournalEntryLine_projectId_idx" ON "JournalEntryLine"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_externalId_key" ON "Lead"("externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_categoryId_idx" ON "Lead"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Opportunity_leadId_idx" ON "Opportunity"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportEntitlement_organizationId_idx" ON "SupportEntitlement"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportEntitlement_clientId_idx" ON "SupportEntitlement"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportEntitlement_projectId_idx" ON "SupportEntitlement"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportEntitlement_status_idx" ON "SupportEntitlement"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportSLAPause_organizationId_idx" ON "SupportSLAPause"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportSLAPause_ticketSlaId_idx" ON "SupportSLAPause"("ticketSlaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportSLAPolicy_organizationId_idx" ON "SupportSLAPolicy"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportSLAPolicy_priority_idx" ON "SupportSLAPolicy"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_clientId_idx" ON "SupportTicket"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_projectId_idx" ON "SupportTicket"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_entitlementId_idx" ON "SupportTicket"("entitlementId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedUserId_idx" ON "SupportTicket"("assignedUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketAuditLog_organizationId_idx" ON "SupportTicketAuditLog"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketAuditLog_ticketId_idx" ON "SupportTicketAuditLog"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketAuditLog_actorUserId_idx" ON "SupportTicketAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketComment_organizationId_idx" ON "SupportTicketComment"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketComment_ticketId_idx" ON "SupportTicketComment"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketComment_type_idx" ON "SupportTicketComment"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketIssueLink_organizationId_idx" ON "SupportTicketIssueLink"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketIssueLink_ticketId_idx" ON "SupportTicketIssueLink"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketIssueLink_issueId_idx" ON "SupportTicketIssueLink"("issueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketSLA_organizationId_idx" ON "SupportTicketSLA"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketSLA_ticketId_idx" ON "SupportTicketSLA"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketSLA_status_idx" ON "SupportTicketSLA"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketSLA_firstResponseStatus_idx" ON "SupportTicketSLA"("firstResponseStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketSLA_resolutionStatus_idx" ON "SupportTicketSLA"("resolutionStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketTaskLink_organizationId_idx" ON "SupportTicketTaskLink"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicketTaskLink_taskId_idx" ON "SupportTicketTaskLink"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_projectId_priority_idx" ON "Task"("projectId", "priority");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "settings_organization_id_idx" ON "settings"("organization_id");

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ChartOfAccount_organizationId_fkey') THEN ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Client_organizationId_fkey') THEN ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Contact_organizationId_fkey') THEN ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_shiftId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_warehouseId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_departmentId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_teamId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_reportingManagerId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Employee_organizationId_fkey') THEN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'File_organizationId_fkey') THEN ALTER TABLE "File" ADD CONSTRAINT "File_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'InvoiceItem_projectId_fkey') THEN ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'JournalEntryLine_projectId_fkey') THEN ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_organizationId_fkey') THEN ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_ownerId_fkey') THEN ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Lead_categoryId_fkey') THEN ALTER TABLE "Lead" ADD CONSTRAINT "Lead_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Opportunity_organizationId_fkey') THEN ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Opportunity_leadId_fkey') THEN ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Order_organizationId_fkey') THEN ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Order_quotationId_fkey') THEN ALTER TABLE "Order" ADD CONSTRAINT "Order_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'OrderItem_quotationItemId_fkey') THEN ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quotationItemId_fkey" FOREIGN KEY ("quotationItemId") REFERENCES "QuotationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Department_organizationId_fkey') THEN ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Department_managerEmployeeId_fkey') THEN ALTER TABLE "Department" ADD CONSTRAINT "Department_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Team_organizationId_fkey') THEN ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Team_departmentId_fkey') THEN ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Team_leadEmployeeId_fkey') THEN ALTER TABLE "Team" ADD CONSTRAINT "Team_leadEmployeeId_fkey" FOREIGN KEY ("leadEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PurchaseItem_projectId_fkey') THEN ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Quotation_organizationId_fkey') THEN ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_defaultWarehouseId_fkey') THEN ALTER TABLE "User" ADD CONSTRAINT "User_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'User_organizationId_fkey') THEN ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Voucher_organizationId_fkey') THEN ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'VoucherLine_projectId_fkey') THEN ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Task_organizationId_fkey') THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Task_departmentId_fkey') THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Task_teamId_fkey') THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Task_parentId_fkey') THEN ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TaskDependency_blockingTaskId_fkey') THEN ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TaskDependency_dependentTaskId_fkey') THEN ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TaskWatcher_taskId_fkey') THEN ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'TaskWatcher_userId_fkey') THEN ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'settings_organization_id_fkey') THEN ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Project_organizationId_fkey') THEN ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Project_departmentId_fkey') THEN ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Project_teamId_fkey') THEN ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Milestone_departmentId_fkey') THEN ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Milestone_teamId_fkey') THEN ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MilestoneDependency_blockingId_fkey') THEN ALTER TABLE "MilestoneDependency" ADD CONSTRAINT "MilestoneDependency_blockingId_fkey" FOREIGN KEY ("blockingId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MilestoneDependency_dependentId_fkey') THEN ALTER TABLE "MilestoneDependency" ADD CONSTRAINT "MilestoneDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Issue_organizationId_fkey') THEN ALTER TABLE "Issue" ADD CONSTRAINT "Issue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_organizationId_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_projectId_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_issueId_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_employeeId_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_taskId_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Timesheet_approvedById_fkey') THEN ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Shift_createdBy_fkey') THEN ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Holiday_createdBy_fkey') THEN ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Holiday_warehouseId_fkey') THEN ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Holiday_organizationId_fkey') THEN ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveType_createdBy_fkey') THEN ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveApplication_createdBy_fkey') THEN ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveApplication_employeeId_fkey') THEN ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveApplication_hrId_fkey') THEN ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_hrId_fkey" FOREIGN KEY ("hrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveApplication_leaveTypeId_fkey') THEN ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'LeaveApplication_managerId_fkey') THEN ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AttendanceLog_deviceId_fkey') THEN ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AttendanceLog_employeeId_fkey') THEN ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Attendance_createdBy_fkey') THEN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Attendance_employeeId_fkey') THEN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Attendance_leaveApplicationId_fkey') THEN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_leaveApplicationId_fkey" FOREIGN KEY ("leaveApplicationId") REFERENCES "LeaveApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Attendance_shiftId_fkey') THEN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Attendance_updatedBy_fkey') THEN ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Overtime_createdBy_fkey') THEN ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Overtime_employeeId_fkey') THEN ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EmployeeLoan_approvedBy_fkey') THEN ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EmployeeLoan_employeeId_fkey') THEN ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EmployeeLoan_voucherId_fkey') THEN ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EmployeeSalary_employeeId_fkey') THEN ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payroll_organizationId_fkey') THEN ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payroll_approvedBy_fkey') THEN ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payroll_createdBy_fkey') THEN ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payroll_paymentVchId_fkey') THEN ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_paymentVchId_fkey" FOREIGN KEY ("paymentVchId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Payroll_voucherId_fkey') THEN ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PayrollItem_projectId_fkey') THEN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PayrollItem_employeeId_fkey') THEN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PayrollItem_payrollId_fkey') THEN ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'BiometricSyncLog_deviceId_fkey') THEN ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'BiometricSyncLog_syncedBy_fkey') THEN ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_syncedBy_fkey" FOREIGN KEY ("syncedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'BiometricDevice_branchId_fkey') THEN ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectBudget_projectId_fkey') THEN ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Checklist_taskId_fkey') THEN ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Checklist_issueId_fkey') THEN ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Checklist_milestoneId_fkey') THEN ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ChecklistItem_checklistId_fkey') THEN ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ActivityReport_userId_fkey') THEN ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ActivityReport_reviewedById_fkey') THEN ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WorkSession_userId_fkey') THEN ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WorkSessionLog_sessionId_fkey') THEN ALTER TABLE "WorkSessionLog" ADD CONSTRAINT "WorkSessionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MyDayTask_userId_fkey') THEN ALTER TABLE "MyDayTask" ADD CONSTRAINT "MyDayTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MyDayTask_taskId_fkey') THEN ALTER TABLE "MyDayTask" ADD CONSTRAINT "MyDayTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_organizationId_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_opportunityId_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_clientId_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_contactId_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_ownerId_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Requirement_preparedById_fkey') THEN ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementSection_organizationId_fkey') THEN ALTER TABLE "RequirementSection" ADD CONSTRAINT "RequirementSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementSection_requirementId_fkey') THEN ALTER TABLE "RequirementSection" ADD CONSTRAINT "RequirementSection_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementItem_organizationId_fkey') THEN ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementItem_requirementId_fkey') THEN ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementItem_sectionId_fkey') THEN ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RequirementSection"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementClarification_organizationId_fkey') THEN ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementClarification_requirementId_fkey') THEN ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementClarification_askedById_fkey') THEN ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'RequirementClarification_answeredById_fkey') THEN ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_organizationId_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_requirementId_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_opportunityId_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_clientId_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_preparedById_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_reviewedById_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Estimation_approvedById_fkey') THEN ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationSection_organizationId_fkey') THEN ALTER TABLE "EstimationSection" ADD CONSTRAINT "EstimationSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationSection_estimationId_fkey') THEN ALTER TABLE "EstimationSection" ADD CONSTRAINT "EstimationSection_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_organizationId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_estimationId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_sectionId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EstimationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_requirementItemId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_requirementItemId_fkey" FOREIGN KEY ("requirementItemId") REFERENCES "RequirementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_departmentId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'EstimationItem_teamId_fkey') THEN ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_opportunityId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_requirementId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_estimationId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_clientId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_contactId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_reviewedById_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_approvedById_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_signedFileId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_signedFileId_fkey" FOREIGN KEY ("signedFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Agreement_parentAgreementId_fkey') THEN ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_parentAgreementId_fkey" FOREIGN KEY ("parentAgreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_quotationId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_opportunityId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_requirementId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_estimationId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_clientId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_contactId_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ServiceSale_approvedById_fkey') THEN ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_quotationId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_opportunityId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_requirementId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_estimationId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_clientId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_contactId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_proposedProjectManagerId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_proposedProjectManagerId_fkey" FOREIGN KEY ("proposedProjectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_acceptedById_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectHandover_projectId_fkey') THEN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_organizationId_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_projectId_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_employeeId_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_departmentId_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_teamId_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_requestedById_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectResourceAllocation_approvedById_fkey') THEN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeBrief_organizationId_fkey') THEN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeBrief_projectId_fkey') THEN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeBrief_createdById_fkey') THEN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeBrief_approvedById_fkey') THEN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_organizationId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_projectId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_creativeBriefId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_creativeBriefId_fkey" FOREIGN KEY ("creativeBriefId") REFERENCES "ProjectCreativeBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_taskId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_assignedEmployeeId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_createdById_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectCreativeDeliverable_approvedVersionId_fkey') THEN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_approvedVersionId_fkey" FOREIGN KEY ("approvedVersionId") REFERENCES "CreativeDeliverableVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreativeDeliverableVersion_organizationId_fkey') THEN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreativeDeliverableVersion_deliverableId_fkey') THEN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectCreativeDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreativeDeliverableVersion_fileId_fkey') THEN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreativeDeliverableVersion_submittedById_fkey') THEN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CreativeDeliverableVersion_reviewedById_fkey') THEN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingPlan_organizationId_fkey') THEN ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingPlan_projectId_fkey') THEN ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingPlan_createdById_fkey') THEN ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_organizationId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_projectId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_marketingPlanId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_marketingPlanId_fkey" FOREIGN KEY ("marketingPlanId") REFERENCES "ProjectMarketingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_assignedEmployeeId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_taskId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_creativeDeliverableId_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_creativeDeliverableId_fkey" FOREIGN KEY ("creativeDeliverableId") REFERENCES "ProjectCreativeDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProjectMarketingCampaign_createdById_fkey') THEN ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_organizationId_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_campaignId_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProjectMarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_taskId_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_assignedEmployeeId_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_createdById_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingContentItem_approvedById_fkey') THEN ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingPerformanceSnapshot_organizationId_fkey') THEN ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingPerformanceSnapshot_campaignId_fkey') THEN ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProjectMarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MarketingPerformanceSnapshot_createdById_fkey') THEN ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'IntegrationConnection_organizationId_fkey') THEN ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookEndpoint_organizationId_fkey') THEN ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookDelivery_organizationId_fkey') THEN ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookDelivery_endpointId_fkey') THEN ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookDeliveryAttempt_organizationId_fkey') THEN ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WebhookDeliveryAttempt_deliveryId_fkey') THEN ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "WebhookDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'IntegrationEvent_organizationId_fkey') THEN ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'IntegrationEvent_connectionId_fkey') THEN ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AutomationRule_organizationId_fkey') THEN ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AutomationExecution_organizationId_fkey') THEN ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AutomationExecution_automationRuleId_fkey') THEN ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DomainOutboxEvent_organizationId_fkey') THEN ALTER TABLE "DomainOutboxEvent" ADD CONSTRAINT "DomainOutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'QueueJob_organizationId_fkey') THEN ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_ProjectTeamMembers_A_fkey') THEN ALTER TABLE "_ProjectTeamMembers" ADD CONSTRAINT "_ProjectTeamMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_ProjectTeamMembers_B_fkey') THEN ALTER TABLE "_ProjectTeamMembers" ADD CONSTRAINT "_ProjectTeamMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_MilestoneToTag_A_fkey') THEN ALTER TABLE "_MilestoneToTag" ADD CONSTRAINT "_MilestoneToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_MilestoneToTag_B_fkey') THEN ALTER TABLE "_MilestoneToTag" ADD CONSTRAINT "_MilestoneToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_IssueToTag_A_fkey') THEN ALTER TABLE "_IssueToTag" ADD CONSTRAINT "_IssueToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_IssueToTag_B_fkey') THEN ALTER TABLE "_IssueToTag" ADD CONSTRAINT "_IssueToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_TagToTask_A_fkey') THEN ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '_TagToTask_B_fkey') THEN ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- RenameIndex
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ProjectDepartmentDependency_projectId_upstreamCapability_downst') AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ProjectDepartmentDependency_projectId_upstreamCapability_do_key') THEN ALTER INDEX "ProjectDepartmentDependency_projectId_upstreamCapability_downst" RENAME TO "ProjectDepartmentDependency_projectId_upstreamCapability_do_key"; END IF; END $$;
