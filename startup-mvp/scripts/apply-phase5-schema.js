const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase5Schema() {
  console.log('--- Applying Phase 5 Estimation Schema & PostgreSQL Migration ---');

  try {
    // 1. Create Enums
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "EstimationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'READY_FOR_QUOTATION', 'REJECTED', 'SUPERSEDED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "CostingMethod" AS ENUM ('HOURLY', 'FIXED', 'QUANTITY', 'DAILY', 'MONTHLY', 'MILESTONE', 'VENDOR_COST', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Estimation Table
    await prisma.$executeRawUnsafe(`
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
    `);

    // 3. Create EstimationSection Table
    await prisma.$executeRawUnsafe(`
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
    `);

    // 4. Create EstimationItem Table
    await prisma.$executeRawUnsafe(`
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
    `);

    // 5. Unique & Indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Estimation_organizationId_estimationNumber_key"
      ON "Estimation"("organizationId", "estimationNumber");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Estimation_organizationId_requirementId_version_key"
      ON "Estimation"("organizationId", "requirementId", "version");
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_organizationId_idx" ON "Estimation"("organizationId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_requirementId_idx" ON "Estimation"("requirementId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_opportunityId_idx" ON "Estimation"("opportunityId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_clientId_idx" ON "Estimation"("clientId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_preparedById_idx" ON "Estimation"("preparedById");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_status_idx" ON "Estimation"("status");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Estimation_isTrash_idx" ON "Estimation"("isTrash");`);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationSection_organizationId_idx" ON "EstimationSection"("organizationId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationSection_estimationId_idx" ON "EstimationSection"("estimationId");`);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_organizationId_idx" ON "EstimationItem"("organizationId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_estimationId_idx" ON "EstimationItem"("estimationId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_sectionId_idx" ON "EstimationItem"("sectionId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_requirementItemId_idx" ON "EstimationItem"("requirementItemId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_departmentId_idx" ON "EstimationItem"("departmentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EstimationItem_teamId_idx" ON "EstimationItem"("teamId");`);

    console.log('✅ Phase 5 PostgreSQL Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error applying Phase 5 schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase5Schema();
