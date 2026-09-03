const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INVESTIGATING VOUCHER & JOURNAL COUNT ===');

  const count = await prisma.voucher.count();
  console.log(`Current Total Voucher Count: ${count}`);

  const testVouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { voucherNumber: { contains: 'P1' } },
        { voucherNumber: { contains: 'gate' } },
        { organizationId: { in: ['org-p1-test-a', 'org-p1-test-b', 'org-gate-a', 'org-gate-b'] } },
      ],
    },
    select: { id: true, voucherNumber: true, organizationId: true, createdAt: true },
  });

  console.log(`Test Vouchers Found: ${testVouchers.length}`);
  testVouchers.forEach((v) => {
    console.log(`  - [${v.id}] ${v.voucherNumber} (Org: ${v.organizationId}, CreatedAt: ${v.createdAt})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
