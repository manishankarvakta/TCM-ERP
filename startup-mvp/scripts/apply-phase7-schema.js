const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase7Schema() {
  console.log('--- Applying Phase 7 ServiceSale Schema & PostgreSQL Migration ---');
  try {
    // 1. Create Enums
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "ServiceSaleStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'APPROVED', 'CONFIRMED', 'IN_FULFILLMENT', 'FULFILLED', 'CANCELLED', 'VOID', 'CLOSED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PARTIALLY_FULFILLED', 'FULLY_FULFILLED', 'ON_HOLD', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create ServiceSale Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ServiceSale" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "serviceSaleNumber" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "agreementNumberSnapshot" TEXT NOT NULL,
        "agreementVersionSnapshot" INTEGER NOT NULL DEFAULT 1,
        "quotationId" TEXT,
        "opportunityId" TEXT,
        "requirementId" TEXT,
        "estimationId" TEXT,
        "clientId" TEXT NOT NULL,
        "contactId" TEXT,
        "title" TEXT NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'TK',
        "contractValueSnapshot" DECIMAL(12,2) NOT NULL,
        "orderValue" DECIMAL(12,2) NOT NULL,
        "status" "ServiceSaleStatus" NOT NULL DEFAULT 'DRAFT',
        "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
        "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "effectiveDate" TIMESTAMP(3),
        "expectedStartDate" TIMESTAMP(3),
        "expectedCompletionDate" TIMESTAMP(3),
        "clientReference" TEXT,
        "internalReference" TEXT,
        "scopeSummary" TEXT,
        "commercialSnapshotJson" JSONB,
        "billingEligibleAt" TIMESTAMP(3),
        "billingEligibleById" TEXT,
        "handoverReadyAt" TIMESTAMP(3),
        "handoverReadyById" TEXT,
        "preparedById" TEXT NOT NULL,
        "approvedById" TEXT,
        "confirmedAt" TIMESTAMP(3),
        "isTrash" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ServiceSale_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Create ServiceSaleItem Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ServiceSaleItem" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "serviceSaleId" TEXT NOT NULL,
        "code" TEXT,
        "description" TEXT NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "notes" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ServiceSaleItem_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. Create Unique Indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ServiceSale_organizationId_serviceSaleNumber_key"
      ON "ServiceSale"("organizationId", "serviceSaleNumber");
    `);

    console.log('✅ Phase 7 PostgreSQL Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase7Schema();
