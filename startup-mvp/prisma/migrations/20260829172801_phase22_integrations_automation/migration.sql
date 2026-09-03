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
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'CONTRACT', 'INTERN', 'DAILY_WORKER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY', 'HOLIDAY', 'WEEKEND');

-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'UNPAID', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'MANAGER_APPROVED', 'HR_APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'REVIEWED', 'APPROVED', 'POSTED', 'PAID');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'WEB', 'MOBILE', 'BIOMETRIC', 'API');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'DISCOVERY', 'WAITING_CLIENT', 'READY_FOR_REVIEW', 'CONFIRMED', 'READY_FOR_ESTIMATION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequirementItemType" AS ENUM ('FEATURE', 'INTEGRATION', 'REPORT', 'MOBILE', 'WEB', 'INFRASTRUCTURE', 'MIGRATION', 'TRAINING', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EstimationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'READY_FOR_QUOTATION', 'REJECTED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CostingMethod" AS ENUM ('HOURLY', 'FIXED', 'QUANTITY', 'DAILY', 'MONTHLY', 'MILESTONE', 'VENDOR_COST', 'OTHER');

-- CreateEnum
CREATE TYPE "CreativeRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'APPROVED', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CreativeBriefStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreativeDeliverableType" AS ENUM ('LOGO', 'BRAND_GUIDELINE', 'LANDING_PAGE_UI', 'DASHBOARD_UI', 'MOBILE_APP_UI', 'SOCIAL_MEDIA_ARTWORK', 'BANNER', 'WIREFRAME', 'PROTOTYPE', 'OTHER');

-- CreateEnum
CREATE TYPE "CreativeDeliverableStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CreativeReviewStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "MarketingRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MarketingCampaignType" AS ENUM ('DIGITAL_MARKETING', 'SEO', 'SEM', 'SOCIAL_MEDIA', 'CONTENT_MARKETING', 'EMAIL_CAMPAIGN', 'PAID_ADS', 'OTHER');

-- CreateEnum
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'PLANNED', 'READY', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketingContentStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DevelopmentRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'BLOCKED');

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
ALTER TYPE "OpportunityStage" ADD VALUE 'UNQUALIFIED';

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


ALTER TYPE "ProjectStatus" ADD VALUE 'DRAFT';
ALTER TYPE "ProjectStatus" ADD VALUE 'ARCHIVED';

-- AlterEnum
ALTER TYPE "SectionType" ADD VALUE 'PAYMENT_TERMS';

-- AlterEnum
ALTER TYPE "VoucherType" ADD VALUE 'RETURN';

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

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DevelopmentTechnicalDeliverable" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "deviceUserId" TEXT,
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "employmentType" "EmploymentType" DEFAULT 'PERMANENT',
ADD COLUMN     "fingerprintDeviceId" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "reportingManagerId" TEXT,
ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "teamId" TEXT,
ADD COLUMN     "utilizationTarget" DOUBLE PRECISION DEFAULT 80.0,
ADD COLUMN     "warehouseId" TEXT,
ALTER COLUMN "organizationId" SET NOT NULL,
DROP COLUMN "address",
ADD COLUMN     "address" JSONB;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Holiday" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Issue" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "alternativePhone" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "closingReason" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "formId" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "messageText" TEXT,
ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "pageId" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "rawPayload" JSONB,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "startingDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "closingReason" TEXT,
ADD COLUMN     "leadId" TEXT,
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "quotationId" DROP NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "quotationItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "organizationId" SET NOT NULL,
DROP COLUMN "creativeWorkRequirement",
ADD COLUMN     "creativeWorkRequirement" "CreativeRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
DROP COLUMN "marketingWorkRequirement",
ADD COLUMN     "marketingWorkRequirement" "MarketingRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
DROP COLUMN "developmentWorkRequirement",
ADD COLUMN     "developmentWorkRequirement" "DevelopmentRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "ProjectCostAllocation" ALTER COLUMN "allocationMethod" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDepartmentDependency" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectDevelopmentPlan" DROP COLUMN "description",
ADD COLUMN     "apiRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "backendRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "databaseRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "environmentNotes" TEXT,
ADD COLUMN     "frontendRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "integrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobileRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repositoryName" TEXT,
ADD COLUMN     "repositoryProvider" TEXT,
ADD COLUMN     "technicalScope" TEXT,
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
ALTER TABLE "Purchase" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "QATestCase" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quotation" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" DROP COLUMN "organizationId";

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
ALTER TABLE "Task" DROP COLUMN "lastRunAt",
DROP COLUMN "nextRunAt",
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultWarehouseId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "salary" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Voucher" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "VoucherLine" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "organization_id" TEXT;

-- CreateTable
CREATE TABLE "Department" (
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
CREATE TABLE "Team" (
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
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "blockingTaskId" TEXT NOT NULL,
    "dependentTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskWatcher" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneDependency" (
    "id" TEXT NOT NULL,
    "blockingId" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
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
CREATE TABLE "Warehouse" (
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
CREATE TABLE "Shift" (
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
CREATE TABLE "LeaveType" (
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
CREATE TABLE "LeaveApplication" (
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
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
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
CREATE TABLE "Overtime" (
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
CREATE TABLE "EmployeeLoan" (
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
CREATE TABLE "EmployeeSalary" (
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
CREATE TABLE "Payroll" (
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
CREATE TABLE "PayrollItem" (
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
CREATE TABLE "BiometricSyncLog" (
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
CREATE TABLE "BiometricDevice" (
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
CREATE TABLE "ProjectBudget" (
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
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
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
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReport" (
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
CREATE TABLE "WorkSession" (
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
CREATE TABLE "WorkSessionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT,
    "projectId" TEXT,

    CONSTRAINT "WorkSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MyDayTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "taskId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MyDayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
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
CREATE TABLE "RequirementSection" (
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
CREATE TABLE "RequirementItem" (
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
CREATE TABLE "RequirementClarification" (
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
CREATE TABLE "Estimation" (
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
CREATE TABLE "EstimationSection" (
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
CREATE TABLE "EstimationItem" (
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
CREATE TABLE "ProjectResourceAllocation" (
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
CREATE TABLE "ProjectCreativeBrief" (
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
CREATE TABLE "ProjectCreativeDeliverable" (
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
CREATE TABLE "CreativeDeliverableVersion" (
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
CREATE TABLE "ProjectMarketingPlan" (
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
CREATE TABLE "ProjectMarketingCampaign" (
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
CREATE TABLE "MarketingContentItem" (
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
CREATE TABLE "MarketingPerformanceSnapshot" (
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
CREATE TABLE "IntegrationConnection" (
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
CREATE TABLE "WebhookEndpoint" (
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
CREATE TABLE "WebhookDelivery" (
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
CREATE TABLE "WebhookDeliveryAttempt" (
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
CREATE TABLE "IntegrationEvent" (
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
CREATE TABLE "AutomationRule" (
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
CREATE TABLE "AutomationExecution" (
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
CREATE TABLE "DomainOutboxEvent" (
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
CREATE TABLE "QueueJob" (
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
CREATE TABLE "_ProjectTeamMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectTeamMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MilestoneToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MilestoneToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_IssueToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IssueToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TagToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Department_organizationId_idx" ON "Department"("organizationId");

-- CreateIndex
CREATE INDEX "Department_organizationId_status_idx" ON "Department"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Department_managerEmployeeId_idx" ON "Department"("managerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_code_key" ON "Department"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "Team_departmentId_idx" ON "Team"("departmentId");

-- CreateIndex
CREATE INDEX "Team_organizationId_departmentId_idx" ON "Team"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "Team_leadEmployeeId_idx" ON "Team"("leadEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_departmentId_code_key" ON "Team"("organizationId", "departmentId", "code");

-- CreateIndex
CREATE INDEX "TaskDependency_dependentTaskId_idx" ON "TaskDependency"("dependentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_blockingTaskId_dependentTaskId_key" ON "TaskDependency"("blockingTaskId", "dependentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskWatcher_taskId_userId_key" ON "TaskWatcher"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneDependency_blockingId_dependentId_key" ON "MilestoneDependency"("blockingId", "dependentId");

-- CreateIndex
CREATE INDEX "Timesheet_projectId_idx" ON "Timesheet"("projectId");

-- CreateIndex
CREATE INDEX "Timesheet_employeeId_idx" ON "Timesheet"("employeeId");

-- CreateIndex
CREATE INDEX "Timesheet_issueId_idx" ON "Timesheet"("issueId");

-- CreateIndex
CREATE INDEX "Timesheet_taskId_idx" ON "Timesheet"("taskId");

-- CreateIndex
CREATE INDEX "Timesheet_date_idx" ON "Timesheet"("date");

-- CreateIndex
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE INDEX "Timesheet_projectId_taskId_idx" ON "Timesheet"("projectId", "taskId");

-- CreateIndex
CREATE INDEX "Timesheet_employeeId_date_idx" ON "Timesheet"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Timesheet_organizationId_idx" ON "Timesheet"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_isTrash_idx" ON "Shift"("isTrash");

-- CreateIndex
CREATE INDEX "Shift_createdBy_idx" ON "Shift"("createdBy");

-- CreateIndex
CREATE INDEX "LeaveApplication_employeeId_idx" ON "LeaveApplication"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveApplication_status_idx" ON "LeaveApplication"("status");

-- CreateIndex
CREATE INDEX "LeaveApplication_startDate_endDate_idx" ON "LeaveApplication"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaveApplication_managerId_idx" ON "LeaveApplication"("managerId");

-- CreateIndex
CREATE INDEX "LeaveApplication_hrId_idx" ON "LeaveApplication"("hrId");

-- CreateIndex
CREATE INDEX "AttendanceLog_employeeId_idx" ON "AttendanceLog"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceLog_timestamp_idx" ON "AttendanceLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_employeeId_timestamp_key" ON "AttendanceLog"("employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_date_idx" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Attendance_isLocked_idx" ON "Attendance"("isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "Overtime_employeeId_idx" ON "Overtime"("employeeId");

-- CreateIndex
CREATE INDEX "Overtime_date_idx" ON "Overtime"("date");

-- CreateIndex
CREATE INDEX "Overtime_status_idx" ON "Overtime"("status");

-- CreateIndex
CREATE INDEX "EmployeeLoan_employeeId_idx" ON "EmployeeLoan"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeLoan_status_idx" ON "EmployeeLoan"("status");

-- CreateIndex
CREATE INDEX "EmployeeLoan_voucherId_idx" ON "EmployeeLoan"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalary_employeeId_key" ON "EmployeeSalary"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_payrollNumber_key" ON "Payroll"("payrollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_voucherId_key" ON "Payroll"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_paymentVchId_key" ON "Payroll"("paymentVchId");

-- CreateIndex
CREATE INDEX "Payroll_month_year_idx" ON "Payroll"("month", "year");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "Payroll_voucherId_idx" ON "Payroll"("voucherId");

-- CreateIndex
CREATE INDEX "Payroll_month_year_status_idx" ON "Payroll"("month", "year", "status");

-- CreateIndex
CREATE INDEX "Payroll_organizationId_idx" ON "Payroll"("organizationId");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_idx" ON "PayrollItem"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollItem_status_idx" ON "PayrollItem"("status");

-- CreateIndex
CREATE INDEX "PayrollItem_employeeId_status_idx" ON "PayrollItem"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollId_employeeId_key" ON "PayrollItem"("payrollId", "employeeId");

-- CreateIndex
CREATE INDEX "BiometricSyncLog_syncTime_idx" ON "BiometricSyncLog"("syncTime");

-- CreateIndex
CREATE INDEX "BiometricSyncLog_vendor_idx" ON "BiometricSyncLog"("vendor");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_serialNumber_key" ON "BiometricDevice"("serialNumber");

-- CreateIndex
CREATE INDEX "BiometricDevice_vendor_idx" ON "BiometricDevice"("vendor");

-- CreateIndex
CREATE INDEX "BiometricDevice_status_idx" ON "BiometricDevice"("status");

-- CreateIndex
CREATE INDEX "ProjectBudget_projectId_idx" ON "ProjectBudget"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "ActivityReport_userId_idx" ON "ActivityReport"("userId");

-- CreateIndex
CREATE INDEX "ActivityReport_reportDate_idx" ON "ActivityReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityReport_userId_reportDate_key" ON "ActivityReport"("userId", "reportDate");

-- CreateIndex
CREATE INDEX "WorkSession_userId_idx" ON "WorkSession"("userId");

-- CreateIndex
CREATE INDEX "WorkSession_date_idx" ON "WorkSession"("date");

-- CreateIndex
CREATE INDEX "WorkSessionLog_sessionId_idx" ON "WorkSessionLog"("sessionId");

-- CreateIndex
CREATE INDEX "MyDayTask_userId_date_idx" ON "MyDayTask"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MyDayTask_userId_date_taskId_key" ON "MyDayTask"("userId", "date", "taskId");

-- CreateIndex
CREATE INDEX "Requirement_organizationId_idx" ON "Requirement"("organizationId");

-- CreateIndex
CREATE INDEX "Requirement_opportunityId_idx" ON "Requirement"("opportunityId");

-- CreateIndex
CREATE INDEX "Requirement_clientId_idx" ON "Requirement"("clientId");

-- CreateIndex
CREATE INDEX "Requirement_ownerId_idx" ON "Requirement"("ownerId");

-- CreateIndex
CREATE INDEX "Requirement_status_idx" ON "Requirement"("status");

-- CreateIndex
CREATE INDEX "Requirement_priority_idx" ON "Requirement"("priority");

-- CreateIndex
CREATE INDEX "Requirement_isTrash_idx" ON "Requirement"("isTrash");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_organizationId_requirementNumber_key" ON "Requirement"("organizationId", "requirementNumber");

-- CreateIndex
CREATE INDEX "RequirementSection_organizationId_idx" ON "RequirementSection"("organizationId");

-- CreateIndex
CREATE INDEX "RequirementSection_requirementId_idx" ON "RequirementSection"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementItem_organizationId_idx" ON "RequirementItem"("organizationId");

-- CreateIndex
CREATE INDEX "RequirementItem_requirementId_idx" ON "RequirementItem"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementItem_sectionId_idx" ON "RequirementItem"("sectionId");

-- CreateIndex
CREATE INDEX "RequirementItem_isTrash_idx" ON "RequirementItem"("isTrash");

-- CreateIndex
CREATE INDEX "RequirementClarification_organizationId_idx" ON "RequirementClarification"("organizationId");

-- CreateIndex
CREATE INDEX "RequirementClarification_requirementId_idx" ON "RequirementClarification"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementClarification_status_idx" ON "RequirementClarification"("status");

-- CreateIndex
CREATE INDEX "Estimation_organizationId_idx" ON "Estimation"("organizationId");

-- CreateIndex
CREATE INDEX "Estimation_requirementId_idx" ON "Estimation"("requirementId");

-- CreateIndex
CREATE INDEX "Estimation_opportunityId_idx" ON "Estimation"("opportunityId");

-- CreateIndex
CREATE INDEX "Estimation_clientId_idx" ON "Estimation"("clientId");

-- CreateIndex
CREATE INDEX "Estimation_preparedById_idx" ON "Estimation"("preparedById");

-- CreateIndex
CREATE INDEX "Estimation_status_idx" ON "Estimation"("status");

-- CreateIndex
CREATE INDEX "Estimation_isTrash_idx" ON "Estimation"("isTrash");

-- CreateIndex
CREATE UNIQUE INDEX "Estimation_organizationId_estimationNumber_key" ON "Estimation"("organizationId", "estimationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Estimation_organizationId_requirementId_version_key" ON "Estimation"("organizationId", "requirementId", "version");

-- CreateIndex
CREATE INDEX "EstimationSection_organizationId_idx" ON "EstimationSection"("organizationId");

-- CreateIndex
CREATE INDEX "EstimationSection_estimationId_idx" ON "EstimationSection"("estimationId");

-- CreateIndex
CREATE INDEX "EstimationItem_organizationId_idx" ON "EstimationItem"("organizationId");

-- CreateIndex
CREATE INDEX "EstimationItem_estimationId_idx" ON "EstimationItem"("estimationId");

-- CreateIndex
CREATE INDEX "EstimationItem_sectionId_idx" ON "EstimationItem"("sectionId");

-- CreateIndex
CREATE INDEX "EstimationItem_requirementItemId_idx" ON "EstimationItem"("requirementItemId");

-- CreateIndex
CREATE INDEX "EstimationItem_departmentId_idx" ON "EstimationItem"("departmentId");

-- CreateIndex
CREATE INDEX "EstimationItem_teamId_idx" ON "EstimationItem"("teamId");

-- CreateIndex
CREATE INDEX "ProjectResourceAllocation_organizationId_idx" ON "ProjectResourceAllocation"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectResourceAllocation_projectId_idx" ON "ProjectResourceAllocation"("projectId");

-- CreateIndex
CREATE INDEX "ProjectResourceAllocation_employeeId_idx" ON "ProjectResourceAllocation"("employeeId");

-- CreateIndex
CREATE INDEX "ProjectResourceAllocation_status_idx" ON "ProjectResourceAllocation"("status");

-- CreateIndex
CREATE INDEX "ProjectResourceAllocation_allocationStartDate_allocationEnd_idx" ON "ProjectResourceAllocation"("allocationStartDate", "allocationEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCreativeBrief_briefNumber_key" ON "ProjectCreativeBrief"("briefNumber");

-- CreateIndex
CREATE INDEX "ProjectCreativeBrief_organizationId_idx" ON "ProjectCreativeBrief"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectCreativeBrief_projectId_idx" ON "ProjectCreativeBrief"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCreativeBrief_status_idx" ON "ProjectCreativeBrief"("status");

-- CreateIndex
CREATE INDEX "ProjectCreativeBrief_briefNumber_idx" ON "ProjectCreativeBrief"("briefNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCreativeDeliverable_approvedVersionId_key" ON "ProjectCreativeDeliverable"("approvedVersionId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_organizationId_idx" ON "ProjectCreativeDeliverable"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_projectId_idx" ON "ProjectCreativeDeliverable"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_creativeBriefId_idx" ON "ProjectCreativeDeliverable"("creativeBriefId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_taskId_idx" ON "ProjectCreativeDeliverable"("taskId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_assignedEmployeeId_idx" ON "ProjectCreativeDeliverable"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "ProjectCreativeDeliverable_status_idx" ON "ProjectCreativeDeliverable"("status");

-- CreateIndex
CREATE INDEX "CreativeDeliverableVersion_organizationId_idx" ON "CreativeDeliverableVersion"("organizationId");

-- CreateIndex
CREATE INDEX "CreativeDeliverableVersion_deliverableId_idx" ON "CreativeDeliverableVersion"("deliverableId");

-- CreateIndex
CREATE INDEX "CreativeDeliverableVersion_submittedById_idx" ON "CreativeDeliverableVersion"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeDeliverableVersion_deliverableId_versionNumber_key" ON "CreativeDeliverableVersion"("deliverableId", "versionNumber");

-- CreateIndex
CREATE INDEX "ProjectMarketingPlan_organizationId_idx" ON "ProjectMarketingPlan"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMarketingPlan_projectId_idx" ON "ProjectMarketingPlan"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMarketingPlan_status_idx" ON "ProjectMarketingPlan"("status");

-- CreateIndex
CREATE INDEX "ProjectMarketingCampaign_organizationId_idx" ON "ProjectMarketingCampaign"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMarketingCampaign_projectId_idx" ON "ProjectMarketingCampaign"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMarketingCampaign_marketingPlanId_idx" ON "ProjectMarketingCampaign"("marketingPlanId");

-- CreateIndex
CREATE INDEX "ProjectMarketingCampaign_assignedEmployeeId_idx" ON "ProjectMarketingCampaign"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "ProjectMarketingCampaign_status_idx" ON "ProjectMarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "MarketingContentItem_organizationId_idx" ON "MarketingContentItem"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingContentItem_campaignId_idx" ON "MarketingContentItem"("campaignId");

-- CreateIndex
CREATE INDEX "MarketingContentItem_status_idx" ON "MarketingContentItem"("status");

-- CreateIndex
CREATE INDEX "MarketingPerformanceSnapshot_organizationId_idx" ON "MarketingPerformanceSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingPerformanceSnapshot_campaignId_idx" ON "MarketingPerformanceSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "MarketingPerformanceSnapshot_snapshotDate_idx" ON "MarketingPerformanceSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_idx" ON "IntegrationConnection"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_status_idx" ON "WebhookEndpoint"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_organizationId_idx" ON "WebhookDelivery"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_idx" ON "WebhookDelivery"("endpointId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventId_idx" ON "WebhookDelivery"("eventId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDeliveryAttempt_organizationId_idx" ON "WebhookDeliveryAttempt"("organizationId");

-- CreateIndex
CREATE INDEX "WebhookDeliveryAttempt_deliveryId_idx" ON "WebhookDeliveryAttempt"("deliveryId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_organizationId_idx" ON "IntegrationEvent"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_connectionId_idx" ON "IntegrationEvent"("connectionId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_status_idx" ON "IntegrationEvent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_organizationId_connectionId_externalEventI_key" ON "IntegrationEvent"("organizationId", "connectionId", "externalEventId");

-- CreateIndex
CREATE INDEX "AutomationRule_organizationId_idx" ON "AutomationRule"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationRule_status_idx" ON "AutomationRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_idempotencyKey_key" ON "AutomationExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationExecution_organizationId_idx" ON "AutomationExecution"("organizationId");

-- CreateIndex
CREATE INDEX "AutomationExecution_automationRuleId_idx" ON "AutomationExecution"("automationRuleId");

-- CreateIndex
CREATE INDEX "AutomationExecution_status_idx" ON "AutomationExecution"("status");

-- CreateIndex
CREATE INDEX "DomainOutboxEvent_organizationId_idx" ON "DomainOutboxEvent"("organizationId");

-- CreateIndex
CREATE INDEX "DomainOutboxEvent_publishedAt_idx" ON "DomainOutboxEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "DomainOutboxEvent_nextAttemptAt_idx" ON "DomainOutboxEvent"("nextAttemptAt");

-- CreateIndex
CREATE INDEX "QueueJob_organizationId_idx" ON "QueueJob"("organizationId");

-- CreateIndex
CREATE INDEX "QueueJob_status_idx" ON "QueueJob"("status");

-- CreateIndex
CREATE INDEX "QueueJob_availableAt_idx" ON "QueueJob"("availableAt");

-- CreateIndex
CREATE INDEX "QueueJob_claimedBy_idx" ON "QueueJob"("claimedBy");

-- CreateIndex
CREATE INDEX "_ProjectTeamMembers_B_index" ON "_ProjectTeamMembers"("B");

-- CreateIndex
CREATE INDEX "_MilestoneToTag_B_index" ON "_MilestoneToTag"("B");

-- CreateIndex
CREATE INDEX "_IssueToTag_B_index" ON "_IssueToTag"("B");

-- CreateIndex
CREATE INDEX "_TagToTask_B_index" ON "_TagToTask"("B");

-- CreateIndex
CREATE INDEX "Activity_type_createdAt_idx" ON "Activity"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Agreement_preparedById_idx" ON "Agreement"("preparedById");

-- CreateIndex
CREATE INDEX "Agreement_status_idx" ON "Agreement"("status");

-- CreateIndex
CREATE INDEX "Agreement_isTrash_idx" ON "Agreement"("isTrash");

-- CreateIndex
CREATE INDEX "ChartOfAccount_organizationId_idx" ON "ChartOfAccount"("organizationId");

-- CreateIndex
CREATE INDEX "Client_organizationId_idx" ON "Client"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_deviceUserId_key" ON "Employee"("deviceUserId");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_warehouseId_idx" ON "Employee"("warehouseId");

-- CreateIndex
CREATE INDEX "File_organizationId_idx" ON "File"("organizationId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "Holiday_warehouseId_idx" ON "Holiday"("warehouseId");

-- CreateIndex
CREATE INDEX "Holiday_organizationId_idx" ON "Holiday"("organizationId");

-- CreateIndex
CREATE INDEX "Holiday_createdBy_idx" ON "Holiday"("createdBy");

-- CreateIndex
CREATE INDEX "Issue_organizationId_idx" ON "Issue"("organizationId");

-- CreateIndex
CREATE INDEX "JournalEntryLine_projectId_idx" ON "JournalEntryLine"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_externalId_key" ON "Lead"("externalId");

-- CreateIndex
CREATE INDEX "Lead_categoryId_idx" ON "Lead"("categoryId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Opportunity_leadId_idx" ON "Opportunity"("leadId");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "SupportEntitlement_organizationId_idx" ON "SupportEntitlement"("organizationId");

-- CreateIndex
CREATE INDEX "SupportEntitlement_clientId_idx" ON "SupportEntitlement"("clientId");

-- CreateIndex
CREATE INDEX "SupportEntitlement_projectId_idx" ON "SupportEntitlement"("projectId");

-- CreateIndex
CREATE INDEX "SupportEntitlement_status_idx" ON "SupportEntitlement"("status");

-- CreateIndex
CREATE INDEX "SupportSLAPause_organizationId_idx" ON "SupportSLAPause"("organizationId");

-- CreateIndex
CREATE INDEX "SupportSLAPause_ticketSlaId_idx" ON "SupportSLAPause"("ticketSlaId");

-- CreateIndex
CREATE INDEX "SupportSLAPolicy_organizationId_idx" ON "SupportSLAPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "SupportSLAPolicy_priority_idx" ON "SupportSLAPolicy"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_organizationId_idx" ON "SupportTicket"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicket_clientId_idx" ON "SupportTicket"("clientId");

-- CreateIndex
CREATE INDEX "SupportTicket_projectId_idx" ON "SupportTicket"("projectId");

-- CreateIndex
CREATE INDEX "SupportTicket_entitlementId_idx" ON "SupportTicket"("entitlementId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedUserId_idx" ON "SupportTicket"("assignedUserId");

-- CreateIndex
CREATE INDEX "SupportTicketAuditLog_organizationId_idx" ON "SupportTicketAuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicketAuditLog_ticketId_idx" ON "SupportTicketAuditLog"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicketAuditLog_actorUserId_idx" ON "SupportTicketAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SupportTicketComment_organizationId_idx" ON "SupportTicketComment"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicketComment_ticketId_idx" ON "SupportTicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicketComment_type_idx" ON "SupportTicketComment"("type");

-- CreateIndex
CREATE INDEX "SupportTicketIssueLink_organizationId_idx" ON "SupportTicketIssueLink"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicketIssueLink_ticketId_idx" ON "SupportTicketIssueLink"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicketIssueLink_issueId_idx" ON "SupportTicketIssueLink"("issueId");

-- CreateIndex
CREATE INDEX "SupportTicketSLA_organizationId_idx" ON "SupportTicketSLA"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicketSLA_ticketId_idx" ON "SupportTicketSLA"("ticketId");

-- CreateIndex
CREATE INDEX "SupportTicketSLA_status_idx" ON "SupportTicketSLA"("status");

-- CreateIndex
CREATE INDEX "SupportTicketSLA_firstResponseStatus_idx" ON "SupportTicketSLA"("firstResponseStatus");

-- CreateIndex
CREATE INDEX "SupportTicketSLA_resolutionStatus_idx" ON "SupportTicketSLA"("resolutionStatus");

-- CreateIndex
CREATE INDEX "SupportTicketTaskLink_organizationId_idx" ON "SupportTicketTaskLink"("organizationId");

-- CreateIndex
CREATE INDEX "SupportTicketTaskLink_taskId_idx" ON "SupportTicketTaskLink"("taskId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_projectId_priority_idx" ON "Task"("projectId", "priority");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "settings_organization_id_idx" ON "settings"("organization_id");

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quotationItemId_fkey" FOREIGN KEY ("quotationItemId") REFERENCES "QuotationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leadEmployeeId_fkey" FOREIGN KEY ("leadEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingTaskId_fkey" FOREIGN KEY ("blockingTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneDependency" ADD CONSTRAINT "MilestoneDependency_blockingId_fkey" FOREIGN KEY ("blockingId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneDependency" ADD CONSTRAINT "MilestoneDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_hrId_fkey" FOREIGN KEY ("hrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_leaveApplicationId_fkey" FOREIGN KEY ("leaveApplicationId") REFERENCES "LeaveApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overtime" ADD CONSTRAINT "Overtime_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoan" ADD CONSTRAINT "EmployeeLoan_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_paymentVchId_fkey" FOREIGN KEY ("paymentVchId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricSyncLog" ADD CONSTRAINT "BiometricSyncLog_syncedBy_fkey" FOREIGN KEY ("syncedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSessionLog" ADD CONSTRAINT "WorkSessionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MyDayTask" ADD CONSTRAINT "MyDayTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MyDayTask" ADD CONSTRAINT "MyDayTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSection" ADD CONSTRAINT "RequirementSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementSection" ADD CONSTRAINT "RequirementSection_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementItem" ADD CONSTRAINT "RequirementItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RequirementSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementClarification" ADD CONSTRAINT "RequirementClarification_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimation" ADD CONSTRAINT "Estimation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationSection" ADD CONSTRAINT "EstimationSection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationSection" ADD CONSTRAINT "EstimationSection_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "EstimationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_requirementItemId_fkey" FOREIGN KEY ("requirementItemId") REFERENCES "RequirementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationItem" ADD CONSTRAINT "EstimationItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_signedFileId_fkey" FOREIGN KEY ("signedFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_parentAgreementId_fkey" FOREIGN KEY ("parentAgreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSale" ADD CONSTRAINT "ServiceSale_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_estimationId_fkey" FOREIGN KEY ("estimationId") REFERENCES "Estimation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_proposedProjectManagerId_fkey" FOREIGN KEY ("proposedProjectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_creativeBriefId_fkey" FOREIGN KEY ("creativeBriefId") REFERENCES "ProjectCreativeBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_approvedVersionId_fkey" FOREIGN KEY ("approvedVersionId") REFERENCES "CreativeDeliverableVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectCreativeDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingPlan" ADD CONSTRAINT "ProjectMarketingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_marketingPlanId_fkey" FOREIGN KEY ("marketingPlanId") REFERENCES "ProjectMarketingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_creativeDeliverableId_fkey" FOREIGN KEY ("creativeDeliverableId") REFERENCES "ProjectCreativeDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMarketingCampaign" ADD CONSTRAINT "ProjectMarketingCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProjectMarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContentItem" ADD CONSTRAINT "MarketingContentItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProjectMarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingPerformanceSnapshot" ADD CONSTRAINT "MarketingPerformanceSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "WebhookDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainOutboxEvent" ADD CONSTRAINT "DomainOutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTeamMembers" ADD CONSTRAINT "_ProjectTeamMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTeamMembers" ADD CONSTRAINT "_ProjectTeamMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneToTag" ADD CONSTRAINT "_MilestoneToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneToTag" ADD CONSTRAINT "_MilestoneToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueToTag" ADD CONSTRAINT "_IssueToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IssueToTag" ADD CONSTRAINT "_IssueToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTask" ADD CONSTRAINT "_TagToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ProjectDepartmentDependency_projectId_upstreamCapability_downst" RENAME TO "ProjectDepartmentDependency_projectId_upstreamCapability_do_key";
