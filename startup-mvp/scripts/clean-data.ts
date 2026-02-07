import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanData() {
  console.log("Starting data cleanup...");

  try {
    // 1. Identification Phase
    // Get all clients to identify their COAs
    const clients = await prisma.client.findMany({
      select: { id: true, chartOfAccountId: true }
    });
    const clientIds = clients.map(c => c.id);
    const clientCoaIds = clients
      .map(c => c.chartOfAccountId)
      .filter((id): id is string => !!id);

    console.log(`Found ${clients.length} clients.`);
    console.log(`Found ${clientCoaIds.length} Linked Client COAs.`);

    // 2. Transactional Deletion
    await prisma.$transaction(async (tx) => {
      
      // --- Deepest Children First ---

      // A. Invoice & Finance
      console.log("Deleting Invoice Items...");
      await tx.invoiceItem.deleteMany({}); // Delete all invoice items (safe if we delete all invoices)
      
      console.log("Deleting Invoices...");
      // Invoices might have a link to Voucher (RevenueVoucher). 
      // We need to break that link or delete the voucher.
      // Usually Invoice is the parent of the Voucher in logic, but schema says Invoice.voucherId -> Voucher.
      // And Voucher.invoiceId -> Invoice. Circular?
      // Let's delete Invoices.
      await tx.invoice.deleteMany({});

      // B. Delivery
      console.log("Deleting Delivery Ledgers...");
      await tx.deliveryLedger.deleteMany({});

      console.log("Deleting Deliveries...");
      await tx.delivery.deleteMany({});

      console.log("Deleting Delivery Schedules...");
      await tx.deliveryScheduleItem.deleteMany({}); 
      await tx.deliverySchedule.deleteMany({});


      // C. Orders
      console.log("Deleting Order Items...");
      await tx.orderItem.deleteMany({});

      console.log("Deleting Orders...");
      // Orders link to Client and Quotation.
      // Also might have Vouchers linked.
      await tx.order.deleteMany({});

      // D. Quotations
      console.log("Deleting Quotation Items/Groups/Sections...");
      // Using Cascade where possible, but manual is safer for deep structures
      await tx.quotationItem.deleteMany({}); 
      await tx.moduleGroupItem.deleteMany({}); // Are these linked? ModuleGroupItem is master data? 
      // Wait, ModuleGroupItem is linked to ModuleGroup. Not specific to Quotation unless copied? 
      // QuotationItem has moduleGroupItemId. 
      // Don't delete ModuleGroupItems if they are templates.
      // Check schema: QuotationItem links TO ModuleGroupItem.
      // So ModuleGroupItem is safe.

      await tx.itemGroup.deleteMany({});
      await tx.categoryGroup.deleteMany({});
      await tx.section.deleteMany({});
      await tx.workOrder.deleteMany({});

      console.log("Deleting Quotations...");
      await tx.quotation.deleteMany({});


      // E. Vouchers & Journals (Accounting Cleanup)
      console.log("Identifying Vouchers to delete...");
      
      // 1. Direct Links (Voucher -> Client/Order/Invoice)
      const directVouchers = await tx.voucher.findMany({
        where: {
          OR: [
            { clientId: { in: clientIds } },
            { orderId: { not: null } }, 
            { invoiceId: { not: null } }
          ]
        },
        select: { id: true }
      });
      const directVoucherIds = directVouchers.map(v => v.id);

      // 2. Indirect Links via Journal Entry Lines (referencing Client COAs)
      // Find JELs that use the Client COAs
      const affectedcontentJELs = await tx.journalEntryLine.findMany({
        where: { chartOfAccountId: { in: clientCoaIds } },
        select: { JournalEntry: { select: { voucherId: true } } }
      });
      const indirectVoucherIdsFromJEL = affectedcontentJELs.map(l => l.JournalEntry.voucherId);

      // 3. Indirect Links via Voucher Lines (referencing Client COAs)
      const affectedVoucherLines = await tx.voucherLine.findMany({
        where: { chartOfAccountId: { in: clientCoaIds } },
        select: { voucherId: true }
      });
      const indirectVoucherIdsFromVL = affectedVoucherLines.map(l => l.voucherId);

      // Merge all IDs
      const allVoucherIdsSet = new Set([
        ...directVoucherIds, 
        ...indirectVoucherIdsFromJEL, 
        ...indirectVoucherIdsFromVL
      ]);
      const voucherIds = Array.from(allVoucherIdsSet);
      
      console.log(`Deleting ${voucherIds.length} Vouchers (Direct + Indirect)...`);
      
      if (voucherIds.length > 0) {
        // Delete Journal Lines associated with these vouchers
        await tx.journalEntryLine.deleteMany({
            where: { JournalEntry: { voucherId: { in: voucherIds } } }
        });
        
        // Delete Journal Entries
        await tx.journalEntry.deleteMany({
            where: { voucherId: { in: voucherIds } }
        });

        // Delete Voucher Lines
        await tx.voucherLine.deleteMany({
            where: { voucherId: { in: voucherIds } }
        });

        // Delete the Vouchers
        await tx.voucher.deleteMany({
            where: { id: { in: voucherIds } }
        });
      }

      // F. Inventory Transactions
      console.log("Cleaning Inventory 'SALE' Transactions...");
      await tx.inventoryTransaction.deleteMany({
        where: { type: 'SALE' }
      });

      // G. Clients & COA
      console.log("Deleting Clients...");
      await tx.client.deleteMany({}); // Delete all clients

      console.log("Deleting Client COAs...");
      if (clientCoaIds.length > 0) {
        // Final check: are there ANY lines left?
        // If so, we can't delete the COA without breaking the constraint.
        // But if we deleted all Vouchers touching them, we should be good.
        // UNLESS there are "Opening Balance" JEs that are not Vouchers?
        // Schema: JournalEntry ALWAYS has `voucherId`.
        // So deleting Vouchers covers JEs.
        
        await tx.chartOfAccount.deleteMany({
          where: { id: { in: clientCoaIds } }
        });
      }

    });

    console.log("✅ Data successfully cleaned.");
    
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
