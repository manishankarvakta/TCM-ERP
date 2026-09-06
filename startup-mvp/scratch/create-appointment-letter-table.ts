import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Applying AppointmentLetter table schema to PostgreSQL...");

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
        CREATE TYPE "AppointmentLetterStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'CANCELLED');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppointmentLetter" (
        "id" TEXT NOT NULL,
        "letterNumber" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "issueDate" DATE NOT NULL,
        "joiningDate" DATE NOT NULL,
        "designation" TEXT NOT NULL,
        "department" TEXT,
        "employmentType" TEXT NOT NULL DEFAULT 'PERMANENT',
        "grossSalary" DECIMAL(12,2) NOT NULL,
        "basicSalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "houseRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "medicalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "conveyanceAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "foodAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
        "probationMonths" INTEGER NOT NULL DEFAULT 3,
        "workLocation" TEXT,
        "termsAndConditions" TEXT,
        "status" "AppointmentLetterStatus" NOT NULL DEFAULT 'ISSUED',
        "isTrash" BOOLEAN NOT NULL DEFAULT false,
        "createdBy" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "AppointmentLetter_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentLetter_letterNumber_key" ON "AppointmentLetter"("letterNumber");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AppointmentLetter_employeeId_idx" ON "AppointmentLetter"("employeeId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AppointmentLetter_status_idx" ON "AppointmentLetter"("status");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AppointmentLetter_issueDate_idx" ON "AppointmentLetter"("issueDate");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
        ALTER TABLE "AppointmentLetter" ADD CONSTRAINT "AppointmentLetter_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
        ALTER TABLE "AppointmentLetter" ADD CONSTRAINT "AppointmentLetter_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
  `);

  console.log("✅ AppointmentLetter table and indexes successfully created in PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("❌ Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
