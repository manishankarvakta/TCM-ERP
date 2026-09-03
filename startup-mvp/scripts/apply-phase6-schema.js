const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPhase6Schema() {
  console.log('--- Applying Phase 6 Agreement Schema & PostgreSQL Migration ---');

  try {
    // 1. Create Enums
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'REVIEW', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'APPROVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'READY_FOR_CLIENT', 'SENT', 'CLIENT_REVIEW', 'ACCEPTED', 'SIGNED', 'ACTIVE', 'REJECTED', 'EXPIRED', 'TERMINATED', 'CANCELLED', 'SUPERSEDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AgreementType" AS ENUM ('PROJECT', 'SERVICE', 'MAINTENANCE', 'RETAINER', 'SUPPORT', 'CONSULTING', 'TRAINING', 'SUBSCRIPTION', 'MASTER_SERVICE', 'STATEMENT_OF_WORK', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AcceptanceMethod" AS ENUM ('SIGNED_DOCUMENT', 'EMAIL_CONFIRMATION', 'DIGITAL_ACCEPTANCE', 'PHYSICAL_SIGNATURE', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Quotation Table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Quotation" (
        "id" TEXT NOT NULL,
        "quotationNumber" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "coverLetter" TEXT,
        "financialStatement" TEXT,
        "tos" TEXT,
        "total" DECIMAL(12,2),
        "discount" DECIMAL(12,2),
        "grandTotal" DECIMAL(12,2),
        "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
        "clientId" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL,
        "updatedById" TEXT,
        "shippingCharges" DECIMAL(10,2),
        "currency" TEXT NOT NULL DEFAULT 'TK',
        "vatIncluded" BOOLEAN DEFAULT false,
        "projectLocation" TEXT,
        "isTrash" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "expiredDate" TIMESTAMP(3),
        "opportunityId" TEXT,
        CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. Create Agreement Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Agreement" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "agreementNumber" TEXT NOT NULL,
        "quotationId" TEXT NOT NULL,
        "opportunityId" TEXT,
        "requirementId" TEXT,
        "estimationId" TEXT,
        "clientId" TEXT NOT NULL,
        "contactId" TEXT,
        "title" TEXT NOT NULL,
        "agreementType" "AgreementType" NOT NULL DEFAULT 'PROJECT',
        "version" INTEGER NOT NULL DEFAULT 1,
        "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
        "currency" TEXT NOT NULL DEFAULT 'TK',
        "contractValue" DECIMAL(12,2) NOT NULL,
        "effectiveDate" TIMESTAMP(3),
        "startDate" TIMESTAMP(3),
        "endDate" TIMESTAMP(3),
        "signedDate" TIMESTAMP(3),
        "expiryDate" TIMESTAMP(3),
        "paymentTerms" TEXT,
        "deliveryTerms" TEXT,
        "clientResponsibilities" TEXT,
        "companyResponsibilities" TEXT,
        "terminationTerms" TEXT,
        "renewalTerms" TEXT,
        "scopeSummary" TEXT,
        "specialConditions" TEXT,
        "internalNotes" TEXT,
        "preparedById" TEXT NOT NULL,
        "reviewedById" TEXT,
        "approvedById" TEXT,
        "acceptedByName" TEXT,
        "acceptedByContactId" TEXT,
        "acceptedAt" TIMESTAMP(3),
        "acceptanceMethod" "AcceptanceMethod",
        "acceptanceReference" TEXT,
        "signedAt" TIMESTAMP(3),
        "signedFileId" TEXT,
        "readyForServiceSaleAt" TIMESTAMP(3),
        "readyForServiceSaleById" TEXT,
        "parentAgreementId" TEXT,
        "commercialSnapshotJson" JSONB,
        "isTrash" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. Create AgreementSection Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AgreementSection" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "content" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AgreementSection_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5. Create AgreementPaymentSchedule Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AgreementPaymentSchedule" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "percentage" DECIMAL(5,2),
        "amount" DECIMAL(12,2) NOT NULL,
        "dueTriggerDescription" TEXT,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AgreementPaymentSchedule_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5b. Create AgreementSnapshotItem Table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AgreementSnapshotItem" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "agreementId" TEXT NOT NULL,
        "code" TEXT,
        "description" TEXT NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(12,2) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AgreementSnapshotItem_pkey" PRIMARY KEY ("id")
      );
    `);

    // 6. Unique Indexes
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "commercialSnapshotJson" JSONB;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_quotationNumber_key"
      ON "Quotation"("quotationNumber");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Agreement_organizationId_agreementNumber_key"
      ON "Agreement"("organizationId", "agreementNumber");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Agreement_organizationId_quotationId_version_key"
      ON "Agreement"("organizationId", "quotationId", "version");
    `);

    console.log('✅ Phase 6 PostgreSQL Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error applying Phase 6 schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyPhase6Schema();
