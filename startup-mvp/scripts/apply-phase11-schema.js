/**
 * PHASE 11 — CREATIVE / DESIGN OPERATIONS ENGINE SCHEMA MIGRATION SCRIPT
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase11Schema() {
  console.log('--- Applying Phase 11 Creative Operations Engine Schema Migration ---');
  try {
    // 1. Create Enums if missing
    const enums = [
      `DO $$ BEGIN CREATE TYPE "CreativeRequirementStatus" AS ENUM ('NOT_REQUIRED', 'REQUIRED', 'READY', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'APPROVED', 'COMPLETED', 'BLOCKED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "CreativeBriefStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "CreativeDeliverableType" AS ENUM ('LOGO', 'BRAND_GUIDELINE', 'LANDING_PAGE_UI', 'DASHBOARD_UI', 'MOBILE_APP_UI', 'SOCIAL_MEDIA_ARTWORK', 'BANNER', 'WIREFRAME', 'PROTOTYPE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "CreativeDeliverableStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'COMPLETED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "CreativeReviewStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];
    for (const sql of enums) {
      await prisma.$executeRawUnsafe(sql);
    }

    // 2. Add additive columns to Project table
    const projCols = [
      `DO $$ BEGIN ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeExecutionReadyAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeExecutionReadyById" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeWorkRequirement" "CreativeRequirementStatus" NOT NULL DEFAULT 'NOT_REQUIRED'; EXCEPTION WHEN duplicate_column THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeCompletedAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creativeCompletedById" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;`,
    ];
    for (const sql of projCols) {
      await prisma.$executeRawUnsafe(sql);
    }

    // 3. Create ProjectCreativeBrief table
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectCreativeBrief_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCreativeBrief_briefNumber_key" ON "ProjectCreativeBrief"("briefNumber");`);

    // 4. Create ProjectCreativeDeliverable table
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectCreativeDeliverable_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProjectCreativeDeliverable_approvedVersionId_key" ON "ProjectCreativeDeliverable"("approvedVersionId");`);

    // 5. Create CreativeDeliverableVersion table
    await prisma.$executeRawUnsafe(`
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
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CreativeDeliverableVersion_deliverableId_versionNumber_key" ON "CreativeDeliverableVersion"("deliverableId", "versionNumber");`);

    // 6. Foreign Key Constraints
    const fkeys = [
      // ProjectCreativeBrief FKs
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeBrief" ADD CONSTRAINT "ProjectCreativeBrief_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,

      // ProjectCreativeDeliverable FKs
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_creativeBriefId_fkey" FOREIGN KEY ("creativeBriefId") REFERENCES "ProjectCreativeBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectCreativeDeliverable" ADD CONSTRAINT "ProjectCreativeDeliverable_approvedVersionId_fkey" FOREIGN KEY ("approvedVersionId") REFERENCES "CreativeDeliverableVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,

      // CreativeDeliverableVersion FKs
      `DO $$ BEGIN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "ProjectCreativeDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "CreativeDeliverableVersion" ADD CONSTRAINT "CreativeDeliverableVersion_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of fkeys) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log('✅ Phase 11 PostgreSQL Schema Migration completed successfully!');
  } catch (error) {
    console.error('❌ Phase 11 Schema Migration Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase11Schema();
