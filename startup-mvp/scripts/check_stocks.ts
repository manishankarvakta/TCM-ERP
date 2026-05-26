
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStocks() {
  const warehouse = await prisma.warehouse.findFirst({
      where: { status: 'active' }
  });

  if (!warehouse) {
      console.log("No active warehouse found");
      return;
  }
  
  console.log(`Checking stocks for warehouse: ${warehouse.name} (${warehouse.id})`);

  const stocks = await prisma.stock.findMany({
      where: { warehouseId: warehouse.id },
      include: { 
        item: true,
        variant: { include: { item: true } }
      }
  });

  console.log(`Found ${stocks.length} stock records.`);
  stocks.forEach(s => {
      const parentItem = s.item || s.variant?.item;
      const itemName = parentItem ? parentItem.name : "Unknown Item";
      const variantSuffix = s.variant ? ` (${s.variant.color} / ${s.variant.size})` : "";
      console.log(`Item: ${itemName}${variantSuffix}, Qty: ${s.quantity}`);
  });
}

checkStocks()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
