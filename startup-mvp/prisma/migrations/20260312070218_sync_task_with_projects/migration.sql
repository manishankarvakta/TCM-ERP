/*
  Warnings:

  - You are about to drop the column `baseUnit` on the `ModuleGroup` table. All the data in the column will be lost.
  - You are about to drop the column `baseUnitPrice` on the `ModuleGroup` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `ModuleGroup` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `depth` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `ModuleGroupItem` table. All the data in the column will be lost.
  - You are about to drop the column `depth` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalShutter` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitShutter` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the `WorkOrder` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code]` on the table `ModuleGroup` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone` on table `Lead` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `name` to the `ModuleGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemId` to the `ModuleGroupItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `quantity` on table `ModuleGroupItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('COVER', 'CLIENT_INFO', 'PROJECT_SUMMARY', 'SCOPE', 'TIMELINE', 'PRICING', 'LEGAL_TERMS', 'ACCEPTANCE', 'EXECUTIVE_SUMMARY', 'COMPANY_OVERVIEW', 'TECHNICAL_APPROACH', 'ARCHITECTURE_OVERVIEW', 'TEAM_STRUCTURE', 'ASSUMPTIONS', 'RISK_ASSESSMENT', 'SUPPORT_SLA', 'APPENDIX', 'SUMMARY', 'TERMS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "QuotationMode" AS ENUM ('STANDARD', 'CUSTOM', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_createdById_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_quotationId_fkey";

-- AlterTable
ALTER TABLE "CoverLetter" ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "Doc" ADD COLUMN     "issueId" TEXT,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "depth" DECIMAL(10,2),
ADD COLUMN     "height" DECIMAL(10,2),
ADD COLUMN     "width" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "facebook" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- AlterTable
ALTER TABLE "ModuleGroup" DROP COLUMN "baseUnit",
DROP COLUMN "baseUnitPrice",
DROP COLUMN "costPrice",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Combo';

-- AlterTable
ALTER TABLE "ModuleGroupItem" DROP COLUMN "code",
DROP COLUMN "depth",
DROP COLUMN "description",
DROP COLUMN "height",
DROP COLUMN "unit",
DROP COLUMN "width",
ADD COLUMN     "itemId" TEXT NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "issueId" TEXT,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TK',
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mode" "QuotationMode" NOT NULL DEFAULT 'STANDARD',
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "QuotationItem" DROP COLUMN "depth",
DROP COLUMN "height",
DROP COLUMN "note",
DROP COLUMN "totalShutter",
DROP COLUMN "unitShutter",
DROP COLUMN "width";

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sectionType" "SectionType" NOT NULL DEFAULT 'PRICING',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "issueId" TEXT,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- DropTable
DROP TABLE "WorkOrder";

-- DropEnum
DROP TYPE "WorkOrderStatus";

-- CreateTable
CREATE TABLE "QuotationTerms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "refundPolicy" TEXT NOT NULL,
    "terminationPolicy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(12,2),
    "clientId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "orderId" TEXT,
    "ownerId" TEXT NOT NULL,
    "projectManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "milestoneId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationTerms_createdBy_idx" ON "QuotationTerms"("createdBy");

-- CreateIndex
CREATE INDEX "QuotationTerms_status_idx" ON "QuotationTerms"("status");

-- CreateIndex
CREATE INDEX "QuotationTerms_title_idx" ON "QuotationTerms"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_opportunityId_idx" ON "Project"("opportunityId");

-- CreateIndex
CREATE INDEX "Project_orderId_idx" ON "Project"("orderId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_projectManagerId_idx" ON "Project"("projectManagerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_issueNumber_key" ON "Issue"("issueNumber");

-- CreateIndex
CREATE INDEX "Issue_milestoneId_idx" ON "Issue"("milestoneId");

-- CreateIndex
CREATE INDEX "Issue_reporterId_idx" ON "Issue"("reporterId");

-- CreateIndex
CREATE INDEX "Issue_assigneeId_idx" ON "Issue"("assigneeId");

-- CreateIndex
CREATE INDEX "Issue_status_idx" ON "Issue"("status");

-- CreateIndex
CREATE INDEX "Doc_projectId_idx" ON "Doc"("projectId");

-- CreateIndex
CREATE INDEX "Doc_milestoneId_idx" ON "Doc"("milestoneId");

-- CreateIndex
CREATE INDEX "Doc_issueId_idx" ON "Doc"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleGroup_code_key" ON "ModuleGroup"("code");

-- CreateIndex
CREATE INDEX "ModuleGroupItem_itemId_idx" ON "ModuleGroupItem"("itemId");

-- CreateIndex
CREATE INDEX "Note_projectId_idx" ON "Note"("projectId");

-- CreateIndex
CREATE INDEX "Note_milestoneId_idx" ON "Note"("milestoneId");

-- CreateIndex
CREATE INDEX "Note_issueId_idx" ON "Note"("issueId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");

-- CreateIndex
CREATE INDEX "Task_issueId_idx" ON "Task"("issueId");

-- AddForeignKey
ALTER TABLE "QuotationTerms" ADD CONSTRAINT "QuotationTerms_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleGroupItem" ADD CONSTRAINT "ModuleGroupItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doc" ADD CONSTRAINT "Doc_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
