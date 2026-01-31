
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
      include: { item: true }
  });

  console.log(`Found ${stocks.length} stock records.`);
  stocks.forEach(s => {
      console.log(`Item: ${s.item.name}, Qty: ${s.quantity}`);
  });
}

checkStocks()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
