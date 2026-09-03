const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recent = await prisma.voucher.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, voucherNumber: true, type: true, date: true, createdAt: true, createdBy: true, organizationId: true },
  });

  console.log('Most Recent 10 Vouchers:');
  recent.forEach((v, i) => {
    console.log(`[${i + 1}] ID: ${v.id} | No: ${v.voucherNumber} | Type: ${v.type} | CreatedAt: ${v.createdAt} | Org: ${v.organizationId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
