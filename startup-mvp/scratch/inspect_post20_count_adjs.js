const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectPost20CountAdjustments() {
  console.log('========================================================================');
  console.log('DETAILED AUDIT OF POST-SEPT 20 COUNT RECONCILIATIONS (ADJ-CNT)');
  console.log('========================================================================\n');

  const post20Adjs = await prisma.inventoryAdjustment.findMany({
    where: {
      adjustmentNumber: { startsWith: 'ADJ-CNT-' },
      createdAt: { gte: new Date('2026-09-21T00:00:00.000Z') }
    },
    orderBy: { createdAt: 'asc' },
    include: {
      items: {
        include: {
          item: { select: { id: true, code: true, name: true, costPrice: true } }
        }
      },
      voucher: {
        include: {
          VoucherLine: {
            include: {
              ChartOfAccount: { select: { code: true, name: true } }
            }
          }
        }
      },
      createdByUser: { select: { name: true, email: true } }
    }
  });

  console.log(`Found ${post20Adjs.length} Auto-Reconcile Adjustments created after 20 Sept:\n`);

  for (const adj of post20Adjs) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`Adjustment: ${adj.adjustmentNumber} | Date: ${adj.date.toISOString().split('T')[0]} | CreatedBy: ${adj.createdByUser?.name}`);
    console.log(`Voucher: ${adj.voucher?.voucherNumber} | Status: ${adj.status} | Notes: ${adj.notes}`);
    console.log(`Items (${adj.items.length}):`);
    
    for (const it of adj.items) {
      // Find current stock of this item
      const curStock = await prisma.stock.findFirst({
        where: { itemId: it.itemId, warehouseId: adj.warehouseId }
      });

      // Find all count entries for this item around that time
      const countEntries = await prisma.inventoryCountEntry.findMany({
        where: { itemId: it.itemId },
        orderBy: { createdAt: 'asc' },
        select: { quantity: true, createdAt: true, creator: { select: { name: true } } }
      });

      const countHist = countEntries.map(c => `${c.createdAt.toISOString().split('T')[0]}(qty:${c.quantity}, by:${c.creator?.name})`).join(', ');

      console.log(`  - [${it.item.code}] ${it.item.name}`);
      console.log(`      Adjusted Delta: ${Number(it.quantity) > 0 ? '+' + it.quantity : it.quantity} | Rate: ৳${it.unitRate} | Amt: ৳${it.amount}`);
      console.log(`      Current Stock in DB: ${curStock?.quantity}`);
      console.log(`      Count Scan History: ${countHist}`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

inspectPost20CountAdjustments();
