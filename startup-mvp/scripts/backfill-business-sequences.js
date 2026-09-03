const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillSequences() {
  console.log('=== EXECUTION OF IDEMPOTENT PRODUCTION BUSINESS SEQUENCE BACKFILL ===\n');

  // 1. Backfill Voucher Sequence for default-org
  const orgId = 'default-org';
  const year = 2026;

  // Extract highest numeric suffix from Voucher table
  const vouchers = await prisma.$queryRawUnsafe(`
    SELECT "voucherNumber" FROM "Voucher" WHERE "organizationId" = '${orgId}' AND "voucherNumber" LIKE 'VCH-${year}-%'
  `);

  let maxSeq = 0;
  for (const v of vouchers) {
    const parts = v.voucherNumber.split('-');
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  console.log(`Audited Historical Voucher Max Sequence for ${orgId} (${year}): ${maxSeq}`);

  // Idempotent upsert into BusinessSequence table
  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO "BusinessSequence" (id, "organizationId", key, year, "currentValue", "createdAt", "updatedAt")
    VALUES ('seq_' || md5('default-org-VOUCHER-2026'), '${orgId}', 'VOUCHER', ${year}, ${maxSeq}, NOW(), NOW())
    ON CONFLICT ("organizationId", key, year)
    DO UPDATE SET "currentValue" = GREATEST("BusinessSequence"."currentValue", ${maxSeq}), "updatedAt" = NOW()
    RETURNING "currentValue";
  `);

  const currentSeqVal = Number(result[0].currentValue);
  const nextVal = currentSeqVal + 1;
  const nextFormatted = `VCH-${year}-${String(nextVal).padStart(6, '0')}`;

  console.log(`✅ BusinessSequence Table Backfilled Successfully:`);
  console.log(`   Organization: ${orgId}`);
  console.log(`   Key: VOUCHER`);
  console.log(`   Year: ${year}`);
  console.log(`   Current Backfilled Value: ${currentSeqVal}`);
  console.log(`   Expected Next Generated Number: ${nextFormatted}\n`);

  console.log('=======================================================\n');
}

backfillSequences()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
