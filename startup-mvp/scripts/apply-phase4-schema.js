const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase4Schema() {
  console.log('=== APPLYING PHASE 4 REQUIREMENTS SCHEMA TO POSTGRESQL ===\n');

  // 0. Ensure OpportunityStage Enum & Opportunity Table Exist
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "OpportunityStage" AS ENUM ('DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Opportunity" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "opportunityNumber" TEXT UNIQUE,
      title TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      value DECIMAL(12,2),
      stage "OpportunityStage" NOT NULL DEFAULT 'DISCOVERY',
      "ownerId" TEXT NOT NULL,
      "contactId" TEXT,
      "expectedCloseDate" TIMESTAMP(3),
      "nextActivityAt" TIMESTAMP(3),
      "closingReason" TEXT,
      "leadId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1. Create Requirement Enums
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'DISCOVERY', 'WAITING_CLIENT', 'READY_FOR_REVIEW', 'CONFIRMED', 'READY_FOR_ESTIMATION', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "RequirementItemType" AS ENUM ('FEATURE', 'INTEGRATION', 'REPORT', 'MOBILE', 'WEB', 'INFRASTRUCTURE', 'MIGRATION', 'TRAINING', 'SUPPORT', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // 2. Create Requirement Table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Requirement" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "requirementNumber" TEXT NOT NULL,
      "opportunityId" TEXT NOT NULL,
      "clientId" TEXT NOT NULL,
      "contactId" TEXT,
      title TEXT NOT NULL,
      summary TEXT,
      "businessObjective" TEXT,
      "scopeOverview" TEXT,
      priority "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
      status "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
      source TEXT,
      "requestedStartDate" TIMESTAMP(3),
      "targetDeliveryDate" TIMESTAMP(3),
      "budgetExpectation" DECIMAL(12,2),
      currency TEXT NOT NULL DEFAULT 'TK',
      "ownerId" TEXT NOT NULL,
      "preparedById" TEXT NOT NULL,
      "confirmedById" TEXT,
      "confirmedAt" TIMESTAMP(3),
      "readyForEstimationAt" TIMESTAMP(3),
      "readyForEstimationById" TEXT,
      "isTrash" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Create RequirementSection Table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RequirementSection" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "requirementId" TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Create RequirementItem Table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RequirementItem" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "requirementId" TEXT NOT NULL,
      "sectionId" TEXT,
      title TEXT NOT NULL,
      description TEXT,
      type "RequirementItemType" NOT NULL DEFAULT 'FEATURE',
      priority "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
      "acceptanceCriteria" TEXT,
      "clientNotes" TEXT,
      "internalNotes" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "isTrash" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Create RequirementClarification Table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RequirementClarification" (
      id TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "requirementId" TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      status "ClarificationStatus" NOT NULL DEFAULT 'OPEN',
      "askedById" TEXT NOT NULL,
      "answeredById" TEXT,
      "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "answeredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Create Indexes & Unique Constraints
  const sqls = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "Requirement_organizationId_requirementNumber_key" ON "Requirement"("organizationId", "requirementNumber")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_organizationId_idx" ON "Requirement"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_opportunityId_idx" ON "Requirement"("opportunityId")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_clientId_idx" ON "Requirement"("clientId")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_ownerId_idx" ON "Requirement"("ownerId")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_status_idx" ON "Requirement"("status")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_priority_idx" ON "Requirement"("priority")`,
    `CREATE INDEX IF NOT EXISTS "Requirement_isTrash_idx" ON "Requirement"("isTrash")`,
    `CREATE INDEX IF NOT EXISTS "RequirementSection_organizationId_idx" ON "RequirementSection"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementSection_requirementId_idx" ON "RequirementSection"("requirementId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementItem_organizationId_idx" ON "RequirementItem"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementItem_requirementId_idx" ON "RequirementItem"("requirementId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementItem_sectionId_idx" ON "RequirementItem"("sectionId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementItem_isTrash_idx" ON "RequirementItem"("isTrash")`,
    `CREATE INDEX IF NOT EXISTS "RequirementClarification_organizationId_idx" ON "RequirementClarification"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementClarification_requirementId_idx" ON "RequirementClarification"("requirementId")`,
    `CREATE INDEX IF NOT EXISTS "RequirementClarification_status_idx" ON "RequirementClarification"("status")`
  ];

  for (const sql of sqls) {
    await prisma.$executeRawUnsafe(sql);
  }

  console.log('✅ Requirement & Opportunity tables and indexes applied successfully to PostgreSQL!');
  console.log('\n=======================================================\n');
}

applyPhase4Schema()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
