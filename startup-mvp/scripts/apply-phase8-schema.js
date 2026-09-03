const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase8Schema() {
  console.log('--- Applying Phase 8 Project & ProjectHandover Schema Migration ---');
  try {
    // 1. Create Enum ProjectHandoverStatus
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ProjectHandoverStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'PROJECT_CREATED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Table Project (if missing)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Project" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "projectNumber" TEXT,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PLANNING',
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "budget" DECIMAL(12, 2),
        "clientId" TEXT NOT NULL,
        "opportunityId" TEXT,
        "orderId" TEXT,
        "ownerId" TEXT NOT NULL,
        "projectManagerId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Create Table ProjectHandover
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProjectHandover" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "handoverNumber" TEXT NOT NULL,
        "serviceSaleId" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "agreementVersionSnapshot" INTEGER NOT NULL DEFAULT 1,
        "quotationId" TEXT,
        "opportunityId" TEXT,
        "requirementId" TEXT,
        "estimationId" TEXT,
        "clientId" TEXT NOT NULL,
        "contactId" TEXT,
        "sourceServiceSaleNumberSnapshot" TEXT NOT NULL,
        "sourceAgreementNumberSnapshot" TEXT NOT NULL,
        "contractValueSnapshot" DECIMAL(12,2) NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'TK',
        "commercialSnapshotJson" JSONB,
        "deliveryScopeSummary" TEXT,
        "clientExpectations" TEXT,
        "exclusions" TEXT,
        "assumptions" TEXT,
        "deliveryNotes" TEXT,
        "technicalNotes" TEXT,
        "kickoffRequirements" TEXT,
        "expectedStartDate" TIMESTAMP(3),
        "expectedCompletionDate" TIMESTAMP(3),
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "status" "ProjectHandoverStatus" NOT NULL DEFAULT 'DRAFT',
        "preparedById" TEXT NOT NULL,
        "proposedProjectManagerId" TEXT,
        "acceptedById" TEXT,
        "acceptedAt" TIMESTAMP(3),
        "rejectionReason" TEXT,
        "projectId" TEXT,
        "isTrash" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectHandover_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. Create Table ProjectHandoverItem
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProjectHandoverItem" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "handoverId" TEXT NOT NULL,
        "sourceServiceSaleItemId" TEXT,
        "code" TEXT,
        "description" TEXT NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(12,2),
        "amount" DECIMAL(12,2),
        "deliveryDescription" TEXT,
        "acceptanceCriteria" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectHandoverItem_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5. Unique Indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ProjectHandover_organizationId_handoverNumber_key" 
      ON "ProjectHandover"("organizationId", "handoverNumber");
    `);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS "Project_organizationId_idx" ON "Project"("organizationId");',
      'CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");',
      'CREATE INDEX IF NOT EXISTS "Project_ownerId_idx" ON "Project"("ownerId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_organizationId_idx" ON "ProjectHandover"("organizationId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_serviceSaleId_idx" ON "ProjectHandover"("serviceSaleId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_agreementId_idx" ON "ProjectHandover"("agreementId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_clientId_idx" ON "ProjectHandover"("clientId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_preparedById_idx" ON "ProjectHandover"("preparedById");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_proposedProjectManagerId_idx" ON "ProjectHandover"("proposedProjectManagerId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_projectId_idx" ON "ProjectHandover"("projectId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_status_idx" ON "ProjectHandover"("status");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandover_isTrash_idx" ON "ProjectHandover"("isTrash");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandoverItem_organizationId_idx" ON "ProjectHandoverItem"("organizationId");',
      'CREATE INDEX IF NOT EXISTS "ProjectHandoverItem_handoverId_idx" ON "ProjectHandoverItem"("handoverId");',
    ];

    for (const sql of indexes) {
      await prisma.$executeRawUnsafe(sql);
    }

    // 6. Foreign Keys
    const fkeys = [
      `DO $$ BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_serviceSaleId_fkey" FOREIGN KEY ("serviceSaleId") REFERENCES "ServiceSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandover" ADD CONSTRAINT "ProjectHandover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN ALTER TABLE "ProjectHandoverItem" ADD CONSTRAINT "ProjectHandoverItem_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "ProjectHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of fkeys) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log('✅ Phase 8 PostgreSQL Migration completed successfully!');
  } catch (error) {
    console.error('❌ Phase 8 Schema Migration Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase8Schema();
