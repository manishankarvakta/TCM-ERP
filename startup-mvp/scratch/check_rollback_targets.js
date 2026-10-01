const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTargets() {
  const targetAdjs = await prisma.inventoryAdjustment.findMany({
    where: {
      adjustmentNumber: { startsWith: 'ADJ-CNT-' },
      createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
    },
    include: {
      items: true,
      voucher: { include: { VoucherLine: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${targetAdjs.length} target ADJ-CNT adjustments to reverse:`);
  let totalItems = 0;
  let totalGainVal = 0;
  let totalLossVal = 0;

  for (const a of targetAdjs) {
    totalItems += a.items.length;
    let netGain = 0;
    let netLoss = 0;
    for (const it of a.items) {
      if (Number(it.quantity) > 0) netGain += Number(it.amount);
      else netLoss += Number(it.amount);
    }
    totalGainVal += netGain;
    totalLossVal += netLoss;
    console.log(`- ${a.adjustmentNumber} (Date: ${a.date.toISOString().split('T')[0]}, Items: ${a.items.length}, Voucher: ${a.voucher?.voucherNumber || 'None'}, Gain: ৳${netGain.toFixed(2)}, Loss: ৳${netLoss.toFixed(2)})`);
  }

  console.log(`\nTotals: ${totalItems} items, Total Gain to Reverse: ৳${totalGainVal.toFixed(2)}, Total Loss to Reverse: ৳${totalLossVal.toFixed(2)}`);

  const countEntries = await prisma.inventoryCountEntry.count({
    where: {
      createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
    }
  });
  console.log(`Target post-20 Count Entries: ${countEntries}`);

  await prisma.$disconnect();
}

checkTargets();
