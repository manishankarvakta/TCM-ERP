const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase9Schema() {
  console.log('--- Applying Phase 9 Project Management Extensions Schema Migration ---');
  try {
    // 1. Create Enum MilestoneStatus if missing
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'AT_RISK', 'BLOCKED', 'READY_FOR_REVIEW', 'CLIENT_REVIEW');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Create Table Milestone if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Milestone" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
        "startDate" TIMESTAMP(3),
        "dueDate" TIMESTAMP(3),
        "order" INTEGER NOT NULL DEFAULT 0,
        "projectId" TEXT NOT NULL,
        "departmentId" TEXT,
        "teamId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Create Table Task if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Task" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'todo',
        "priority" TEXT NOT NULL DEFAULT 'medium',
        "startDate" TIMESTAMP(3),
        "dueDate" TIMESTAMP(3),
        "estimatedHours" DOUBLE PRECISION,
        "entityType" TEXT,
        "entityId" TEXT,
        "userId" TEXT NOT NULL,
        "assigneeId" TEXT,
        "contactId" TEXT,
        "opportunityId" TEXT,
        "leadId" TEXT,
        "projectId" TEXT,
        "milestoneId" TEXT,
        "issueId" TEXT,
        "departmentId" TEXT,
        "teamId" TEXT,
        "parentId" TEXT,
        "isRecurring" BOOLEAN NOT NULL DEFAULT false,
        "recurrenceRule" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. Create Table TaskDependency if missing
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TaskDependency" (
        "id" TEXT NOT NULL,
        "blockingId" TEXT NOT NULL,
        "dependentId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5. Add columns to Project table
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "health" TEXT NOT NULL DEFAULT 'ON_TRACK';
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "resourcePlanningReadyAt" TIMESTAMP(3);
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "resourcePlanningReadyById" TEXT;
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "readyForQAAt" TIMESTAMP(3);
        ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "readyForClientReviewAt" TIMESTAMP(3);
      EXCEPTION WHEN duplicate_column THEN null; END $$;
    `);

    // 6. Foreign Key Constraints
    const fkeys = [
      `DO $$ BEGIN ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockingId_fkey" FOREIGN KEY ("blockingId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of fkeys) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log('✅ Phase 9 PostgreSQL Schema Migration completed successfully!');
  } catch (error) {
    console.error('❌ Phase 9 Schema Migration Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase9Schema();
