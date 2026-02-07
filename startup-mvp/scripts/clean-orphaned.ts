import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanOrphaned() {
  console.log("Cleaning Orphaned/Transient Data...");
  try {
    const s = await prisma.session.deleteMany({});
    console.log(`✅ Sessions cleaned (${s.count}).`);

    const ul = await prisma.userLog.deleteMany({});
    console.log(`✅ UserLogs cleaned (${ul.count}).`);

    const n = await prisma.notification.deleteMany({});
    console.log(`✅ Notifications cleaned (${n.count}).`);
    
    const it = await prisma.inventoryTransaction.deleteMany({});
    console.log(`✅ InventoryTransactions cleaned (${it.count}).`);

    await prisma.purchaseItem.deleteMany({});
    const p = await prisma.purchase.deleteMany({});
    console.log(`✅ Purchases cleaned (${p.count}).`);

    await prisma.itemCategory.deleteMany({});
    const i = await prisma.item.deleteMany({});
    console.log(`✅ Items cleaned (${i.count}).`);
    
    // Suppliers
    const sup = await prisma.supplier.deleteMany({});
    console.log(`✅ Suppliers cleaned (${sup.count}).`);

    // Employees
    const emp = await prisma.employee.deleteMany({});
    console.log(`✅ Employees cleaned (${emp.count}).`);
    
    // Quotations / Orders
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.deliveryLedger.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.deliveryScheduleItem.deleteMany({});
    await prisma.deliverySchedule.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    
    await prisma.quotationItem.deleteMany({});
    await prisma.moduleGroupItem.deleteMany({});
    await prisma.itemGroup.deleteMany({});
    await prisma.categoryGroup.deleteMany({});
    await prisma.section.deleteMany({});
    await prisma.workOrder.deleteMany({});
    
    const q = await prisma.quotation.deleteMany({});
    console.log(`✅ Quotations cleaned (${q.count}).`);
    
    const c = await prisma.client.deleteMany({});
    console.log(`✅ Clients cleaned (${c.count}).`);
    
    // User Permissions
    const up = await prisma.userPermission.deleteMany({});
    console.log(`✅ UserPermissions cleaned (${up.count}).`);


  } catch (error) {
    console.error("❌ Failed to clean orphaned data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOrphaned();
