
import { prisma } from "@/lib/prisma";
import { processPurchaseReceipt } from "./app/actions/purchase-accounting-integration";
import { VoucherType, InventoryTransactionType } from "@prisma/client";

async function tracePurchaseFlow() {
  console.log("🚀 Starting Purchase Flow Trace...");

  try {
    // 1. Setup: Ensure User & Supplier exist
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");
    
    // Create specific supplier for tracing to avoid noise
    const supplier = await prisma.supplier.create({
      data: {
        name: `Trace Supplier ${Date.now()}`,
        email: `trace-supplier-${Date.now()}@example.com`,
        phone: "1234567890",
        address: "Trace Address",
        status: "active",
        createdBy: user.id // Fix: Add required createdBy field
      }
    });

    // Create a new item for clean tracing
    const item = await prisma.item.create({
      data: {
        code: `TRC-${Date.now()}`,
        description: "Raw Material for Tracing",
        costPrice: 100,
        unitPrice: 150,
        quantity: 0, // Initial Stock
        status: "active",
        unitId: (await prisma.unit.findFirst())?.id || "default_unit_id" // Fallback if needed, assuming unit exists
      }
    });

    console.log(`✅ Setup Complete: Item ${item.code} (Stock: ${item.quantity}), Supplier ${supplier.name}`);

    // 2. Create Purchase Order
    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber: `PO-TRACE-${Date.now()}`,
        date: new Date(),
        supplierId: supplier.id,
        status: "DRAFT",
        grandTotal: 1000,
        subTotal: 1000,
        items: {
          create: [
            {
              itemId: item.id,
              quantity: 10,
              unitPrice: 100,
              amount: 1000,
              description: "Trace Item Purchase"
            }
          ]
        },
        createdBy: user.id
      },
      include: { items: true }
    });

    console.log(`✅ Purchase Order Created: ${purchase.purchaseNumber} (Status: ${purchase.status})`);

    // 3. Trigger Receive / GRN Process
    // This calls our integration logic which should handle Accounting + Inventory
    console.log("🔄 Triggering processPurchaseReceipt...");
    const result = await processPurchaseReceipt(purchase.id, user.id);

    if (!result.success) {
      throw new Error(`Process failed: ${result.error}`);
    }

    console.log(`✅ Purchase Received & Processed. Voucher ID: ${result.voucherId}`);

    // 4. Verify Inventory Stock (DB Level)
    const updatedItem = await prisma.item.findUnique({ where: { id: item.id } });
    console.log(`🔍 Verified Item Stock: Expected 10, Found ${updatedItem?.quantity}`);
    
    if (Number(updatedItem?.quantity) !== 10) {
      console.error("❌ Stock Mismatch!");
    } else {
      console.log("✅ Stock Correct.");
    }

    // 5. Verify Stock Ledger (InventoryTransaction)
    const stockTx = await prisma.inventoryTransaction.findFirst({
      where: {
        itemId: item.id,
        type: InventoryTransactionType.PURCHASE,
        reference: result.voucherId
      }
    });

    if (stockTx && Number(stockTx.quantity) === 10) {
      console.log("✅ Stock Ledger Entry Found & Correct.");
    } else {
      console.error("❌ Stock Ledger Entry Missing or Incorrect", stockTx);
    }

    // 6. Verify Accounting Voucher & Journal Entries
    const voucher = await prisma.voucher.findUnique({
      where: { id: result.voucherId },
      include: {
        VoucherLine: { include: { ChartOfAccount: true } },
        JournalEntry: {
           include: { JournalEntryLine: { include: { ChartOfAccount: true } } }
        }
      }
    });

    if (!voucher) throw new Error("Voucher not found in verification");

    console.log(`🔍 Voucher Status: ${voucher.status}`);
    console.log(`🔍 Voucher Type: ${voucher.type}`); // Should be PURCHASE

    // Check Debits and Credits
    let debitInventory = 0;
    let creditAP = 0;

    voucher.VoucherLine.forEach(line => {
      console.log(`   Line: ${line.ChartOfAccount.name} | DR: ${line.debitAmount} | CR: ${line.creditAmount}`);
      if (line.ChartOfAccount.name.includes("Inventory Asset")) debitInventory += Number(line.debitAmount);
      if (line.ChartOfAccount.name.includes("Accounts Payable")) creditAP += Number(line.creditAmount);
    });

    if (debitInventory === 1000 && creditAP === 1000) {
      console.log("✅ Accounting Entries Correct (DR Inventory 1000, CR AP 1000)");
    } else {
      console.error(`❌ Accounting Mismatch. DR Inventory: ${debitInventory}, CR AP: ${creditAP}`);
    }

    // 7. Verification Summary
    console.log("\n--- TRACE SUMMARY ---");
    console.log("1. PO Created: Yes");
    console.log("2. GRN/Receive: Yes");
    console.log("3. Stock Ledger: ", !!stockTx ? "Yes" : "No");
    console.log("4. Inventory Asset Updated: ", debitInventory === 1000 ? "Yes" : "No");
    console.log("5. AP Credited: ", creditAP === 1000 ? "Yes" : "No");
    console.log("---------------------");

    // Cleanup (Optional, but good for local dev repetition)
    // await prisma.inventoryTransaction.deleteMany({ where: { itemId: item.id } });
    // await prisma.item.delete({ where: { id: item.id } });
    // console.log("🧹 Cleanup Done");

  } catch (error) {
    console.error("❌ Trace Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

tracePurchaseFlow();
