const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sale = await prisma.sale.findFirst({
    where: { saleNumber: 'SAL-2026-0788' },
    include: {
      items: {
        include: {
          item: true,
          variant: true
        }
      }
    }
  });

  if (!sale) {
    console.log("Sale not found!");
    return;
  }

  console.log(`Sale Number: ${sale.saleNumber}`);
  console.log(`Total Items Count: ${sale.items.length}`);
  
  const result = sale.items.map((si, idx) => {
    const qty = Number(si.quantity);
    const price = Number(si.unitPrice);
    const total = qty * price;
    return {
      sl: idx + 1,
      itemCode: si.item?.code || 'N/A',
      itemName: si.item?.name || 'N/A',
      sku: si.variant?.sku || si.item?.code || 'N/A',
      barcode: si.variant?.barcode || si.variant?.sku || si.item?.code || 'N/A',
      size: si.variant?.size || 'N/A',
      color: si.variant?.color || 'N/A',
      qty: qty,
      unitPrice: price,
      totalAmount: total
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
