import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting COMPLETE data reset...");

  try {
    // 1. Linked Metadata & Files
    console.log("🗑️ Cleaning metadata and activities...");
    await prisma.entityFileLink.deleteMany({});
    await prisma.analytics.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.activity.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.doc.deleteMany({});
    await prisma.userLog.deleteMany({}); // Cleaning logs too for a fresh start

    // 2. Sales & Logistics
    console.log("🗑️ Cleaning sales and logistics...");
    await prisma.deliveryLedger.deleteMany({});
    await prisma.deliveryScheduleItem.deleteMany({});
    await prisma.deliverySchedule.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    // Clean up Vouchers references before deleting master data
    await prisma.voucher.updateMany({
        where: { NOT: { invoiceId: null } },
        data: { invoiceId: null }
    });
    // Also decouple from Clients/Suppliers/Orders if we are deleting them
    await prisma.voucher.updateMany({
      data: { 
        clientId: null,
        supplierId: null,
        organizationId: null,
        orderId: null
      }
    });

    await prisma.invoice.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.quotationItem.deleteMany({});
    await prisma.section.deleteMany({});
    await prisma.workOrder.deleteMany({});
    await prisma.quotation.deleteMany({});

    // 3. Procurement
    console.log("🗑️ Cleaning procurement...");
    await prisma.purchaseItem.deleteMany({});
    await prisma.purchase.deleteMany({});

    // 4. CRM Core & Participants
    console.log("🗑️ Cleaning CRM entities...");
    await prisma.opportunity.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.contact.deleteMany({});
    
    // 5. Relations (Clients, Suppliers, Orgs)
    console.log("🗑️ Cleaning base entities...");
    // These are often linked to Vouchers/Journal Entries, but if user wants a RESET, 
    // we should clear them (or at least check if we can). 
    // Assuming accounting data (Vouchers) should be KEPT but unlinked from specific CRM clients.
    
    // We already unlinked Vouchers above.
    await prisma.client.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.organization.deleteMany({});

    console.log("✅ Complete reset finished successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
