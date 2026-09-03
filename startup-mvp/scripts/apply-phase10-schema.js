const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase10Schema() {
  console.log('--- Applying Phase 10 Resource Planning & Allocation Engine Schema Migration ---');
  try {
    // 1. Create Enum AllocationStatus if missing
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AllocationStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'PAUSED', 'RELEASED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Create Table ProjectResourceAllocation if missing
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectResourceAllocation_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Add columns to Project table if missing
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentExecutionReadyAt" TIMESTAMP(3);
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentExecutionReadyById" TEXT;
      EXCEPTION WHEN duplicate_column THEN null; END $$;
    `);

    // 4. Foreign Key Constraints
    const fkeys = [
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectResourceAllocation" ADD CONSTRAINT "ProjectResourceAllocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of fkeys) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log('✅ Phase 10 PostgreSQL Schema Migration completed successfully!');
  } catch (error) {
    console.error('❌ Phase 10 Schema Migration Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase10Schema();
