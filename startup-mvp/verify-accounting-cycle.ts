
import { prisma } from "@/lib/prisma";
import { processPurchaseReceipt } from "@/app/actions/purchase-accounting-integration";
import { createSalesVoucherForQuotation } from "@/app/actions/quotation-accounting-integration";

async function verifyAccounting() {
  console.log("Starting Accounting Verification...");

  // 1. Setup Data
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("Admin not found");

  // Ensure accounts exist (seed if needed)
  const ensureAccount = async (name: string, type: "ASSET" | "LIABILITY" | "REVENUE" | "EXPENSE", code: string) => {
    let account = await prisma.chartOfAccount.findFirst({ where: { name } });
    if (!account) {
      console.log(`Creating missing account: ${name}`);
      const admin = await prisma.user.findFirst({ where: { role: "admin" } });
      account = await prisma.chartOfAccount.create({
        data: {
          name,
          code,
          type,
          status: "active",
          createdBy: admin!.id,
          id: `ACC-${code}`,
          updatedAt: new Date()
        }
      });
    }
    return account;
  };

  const inventoryAccount = await ensureAccount("Inventory Asset", "ASSET", "1200");
  const apAccount = await ensureAccount("Accounts Payable", "LIABILITY", "2100");
  const salesAccount = await ensureAccount("Sales", "REVENUE", "4000");
  const cogsAccount = await ensureAccount("Cost of Goods Sold", "EXPENSE", "5000");
  const arAccount = await ensureAccount("Accounts Receivable", "ASSET", "1100");

  // Create Item
  const item = await prisma.item.create({
    data: {
      code: `TEST-ITEM-${Date.now()}`,
      description: "Test Inventory Item",
      unitPrice: 100, // Selling Price
      costPrice: 60,  // Cost Price
      unit: { 
        create: { 
          details: "Pieces", 
          symbol: `pcs-${Date.now()}`, 
          createdBy: admin.id 
        } 
      },
      // Item has no createdBy field
    }
  });
  console.log("Created Item:", item.code);

  // Create Supplier & Client
  const supplier = await prisma.supplier.create({
    data: { name: `Ref-Supplier-${Date.now()}`, email: `sup${Date.now()}@test.com`, createdBy: admin.id }
  });
  const client = await prisma.client.create({
    data: { name: `Ref-Client-${Date.now()}`, email: `cli${Date.now()}@test.com`, createdBy: admin.id }
  });

  // 2. PURCHASE FLOW
  console.log("\n--- TEST: PURCHASE FLOW ---");
  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber: `PO-TEST-${Date.now()}`,
      supplierId: supplier.id,
      date: new Date(),
      status: "DRAFT",
      subTotal: 600,
      grandTotal: 600,
      createdBy: admin.id,
      items: {
        create: [
          { itemId: item.id, quantity: 10, unitPrice: 60, amount: 600, description: item.description }
        ]
      }
    }
  });

  // Execute Receipt
  const purchaseResult = await processPurchaseReceipt(purchase.id, admin.id);
  console.log("Purchase Receipt Result:", purchaseResult);

  if (!purchaseResult.success) throw new Error("Purchase Failed: " + purchaseResult.error);

  // Validate Inventory
  const updatedItem = await prisma.item.findUnique({ where: { id: item.id } });
  console.log(`Inventory Qty (Expect 10): ${updatedItem?.quantity}`);
  
  if (Number(updatedItem?.quantity) !== 10) throw new Error("Inventory Qty Mismatch afer Purchase");

  // Validate GL
  const purchaseVoucher = await prisma.voucher.findUnique({ 
    where: { id: purchaseResult.voucherId! },
    include: { VoucherLine: true }
  });
  console.log("Purchase Voucher:", purchaseVoucher?.voucherNumber);
  console.log("Lines:", purchaseVoucher?.VoucherLine.length); // Expect 2

  // 3. SALES FLOW
  console.log("\n--- TEST: SALES FLOW ---");
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: `QT-TEST-${Date.now()}`,
      clientId: client.id,
      subject: "Test Quotation",
      date: new Date(),
      expiredDate: new Date(),
      status: "ACCEPTED",
      total: 500,
      grandTotal: 500,
      submittedById: admin.id,
      section: {
        create: {
          title: "Main",
          total: 500,
          items: {
            create: [
              { 
                item: { connect: { id: item.id } }, 
                quantity: 5, 
                unitPrice: 100, 
                amount: 500, 
                description: item.description,
                sl: 1
              }
            ]
          }
        }
      }
    }
  });

  // Execute Sales Voucher
  const salesResult = await createSalesVoucherForQuotation(
    quotation.id, 
    quotation.quotationNumber, 
    client.id, 
    500, 
    admin.id, 
    new Date()
  );
  console.log("Sales Voucher Result:", salesResult);

  if (!salesResult.success) throw new Error("Sales Failed: " + salesResult.error);

  // Validate Inventory
  const finalItem = await prisma.item.findUnique({ where: { id: item.id } });
  console.log(`Inventory Qty (Expect 5): ${finalItem?.quantity}`);

  if (Number(finalItem?.quantity) !== 5) throw new Error("Inventory Qty Mismatch after Sale");

  // Validate GL (COGS)
  const salesVoucher = await prisma.voucher.findUnique({ 
    where: { id: salesResult.voucherId! },
    include: { VoucherLine: true }
  });
  console.log("Sales Voucher:", salesVoucher?.voucherNumber);
  console.log("Lines:", salesVoucher?.VoucherLine.length); // Expect 4 (AR, Sales, COGS, Inventory)

  if (salesVoucher?.VoucherLine.length !== 4) {
    console.log("Lines found:", salesVoucher?.VoucherLine);
    throw new Error("Sales Voucher missing COGS/Inventory lines");
  }

  console.log("\n✅ VERIFICATION SUCCESSFUL");
}

verifyAccounting()
  .catch((e) => {
    console.error("Verification Failed:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
