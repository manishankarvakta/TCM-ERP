import { PrismaClient, PurchaseStatus, VoucherType, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  console.log("Starting test case: Raw Material Purchase Accounting Integration");

  // 1. Setup - find a user, supplier, warehouse, and raw material item
  const user = await prisma.user.findFirst();
  const supplier = await prisma.supplier.findFirst();
  const warehouse = await prisma.warehouse.findFirst({ where: { status: "active", isTrash: false } });
  const item = await prisma.item.findFirst({ where: { itemType: "RAW_MATERIAL", status: "active", isTrash: false } });

  if (!user || !supplier || !warehouse || !item) {
    console.error("Setup failed: missing required data", { user: !!user, supplier: !!supplier, warehouse: !!warehouse, item: !!item });
    return;
  }

  console.log(`Using User: ${user.email}, Supplier: ${supplier.name}, Warehouse: ${warehouse.name}, Item: ${item.name}`);

  // 2. Mock input for createPurchase
  const purchaseData = {
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    date: new Date(),
    status: PurchaseStatus.RECEIVED,
    notes: "Test Purchase for Debugging",
    items: [
      {
        itemId: item.id,
        description: item.name,
        quantity: 10,
        unitPrice: 150,
        amount: 1500
      }
    ],
    discount: 0,
    tax: 0
  };

  try {
    // We can't call the server action directly from here easily due to auth() etc.
    // So we will just simulate what happens in the server action but with logging.
    
    console.log("Step 1: Creating Purchase...");
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: "TEST-PUR-" + Date.now(),
        supplierId: purchaseData.supplierId,
        warehouseId: purchaseData.warehouseId,
        date: purchaseData.date,
        status: purchaseData.status,
        notes: purchaseData.notes,
        subTotal: 1500,
        grandTotal: 1500,
        createdBy: user.id,
        items: {
          create: purchaseData.items.map(i => ({
            itemId: i.itemId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.amount
          }))
        }
      },
      include: { items: { include: { item: true } }, supplier: true }
    });
    console.log(`Purchase created: ${purchase.purchaseNumber}, ID: ${purchase.id}`);

    // Now call the accounting integration logic
    console.log("Step 2: Calling createPurchaseAccountingVoucher logic...");
    
    // Manual implementation of createPurchaseAccountingVoucher logic to see where it fails
    const apAccountId = await prisma.chartOfAccount.findFirst({ where: { name: { contains: "Accounts Payable", mode: 'insensitive' } } });
    const rawMaterialInventoryId = await prisma.chartOfAccount.findFirst({ where: { name: { contains: "Raw Material Inventory", mode: 'insensitive' } } });

    console.log(`Accounts Found: AP: ${apAccountId?.id}, RM Inv: ${rawMaterialInventoryId?.id}`);

    if (!apAccountId || !rawMaterialInventoryId) {
      console.error("Account lookup failed");
      return;
    }

    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: 1500,
        creditAmount: 0,
        description: `Raw Material Inventory - ${purchase.purchaseNumber}`,
        chartOfAccountId: rawMaterialInventoryId.id,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: 1500,
        description: `Accounts Payable - ${purchase.purchaseNumber} - ${purchase.supplier.name}`,
        chartOfAccountId: apAccountId.id,
        supplierId: purchase.supplierId,
      }
    ];

    // Simulate createVoucher
    console.log("Step 3: Creating Voucher...");
    const voucher = await prisma.voucher.create({
      data: {
        voucherNumber: "TEST-VCH-" + Date.now(),
        date: purchase.date,
        type: VoucherType.PURCHASE,
        reference: purchase.purchaseNumber,
        description: `Purchase ${purchase.purchaseNumber} - ${purchase.supplier.name}`,
        status: "draft",
        createdBy: user.id,
        supplierId: purchase.supplierId,
        voucherLines: {
          create: voucherLines.map(l => ({
            lineNumber: l.lineNumber,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            description: l.description,
            chartOfAccountId: l.chartOfAccountId,
            supplierId: l.supplierId
          }))
        }
      }
    });
    console.log(`Voucher created: ${voucher.voucherNumber}, ID: ${voucher.id}`);

    // Simulate postVoucher
    console.log("Step 4: Posting Voucher...");
    await prisma.$transaction(async (tx) => {
      const entryNumber = "TEST-JE-" + Date.now();
      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          status: "posted",
          createdBy: user.id,
          postedBy: user.id,
          postedAt: new Date(),
          journalEntryLines: {
            create: voucherLines.map(l => ({
              lineNumber: l.lineNumber,
              debitAmount: l.debitAmount,
              creditAmount: l.creditAmount,
              description: l.description,
              chartOfAccountId: l.chartOfAccountId,
              supplierId: l.supplierId
            }))
          }
        }
      });
      await tx.voucher.update({
        where: { id: voucher.id },
        data: { status: "posted", postedById: user.id, postedAt: new Date() }
      });
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { voucherId: voucher.id }
      });
    });
    console.log("Voucher posted and linked successfully.");

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
