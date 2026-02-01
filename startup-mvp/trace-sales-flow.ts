
import { prisma } from "@/lib/prisma";
import { createSalesVoucherForQuotation } from "./app/actions/quotation-accounting-integration";
import { InventoryTransactionType, VoucherType } from "@prisma/client";
import { randomUUID } from "crypto";

async function traceSalesFlow() {
  console.log("🚀 Starting Sales Flow Trace...");

  try {
    // 1. Setup: User, Client, Item
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");

    // Create Client
    const client = await prisma.client.create({
      data: {
        name: `Trace Client ${Date.now()}`,
        email: `trace-client-${Date.now()}@example.com`,
        status: "active",
        createdBy: user.id
      }
    });

    // Create Item (Product)
    // Cost: 900, Selling Price: 1500
    const item = await prisma.item.create({
        data: {
          code: `PROD-${Date.now()}`,
          description: "Finished Goods",
          costPrice: 900,
          unitPrice: 1500,
          quantity: 10, // Initial Stock
          status: "active",
          unitId: (await prisma.unit.findFirst())?.id || "default_unit",
        }
    });

    console.log(`✅ Setup Complete: Item ${item.code} (Cost: 900, Price: 1500, Stock: 10)`);

    // 2. Create Quotation (Simulating a Sale)
    const quotationNumber = `QT-${Date.now()}`;
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        subject: "Trace Sale",
        clientId: client.id,
        status: "ACCEPTED", // Must be accepted usually? Logic didn't check status but implied 'accepted quotation'
        grandTotal: 1500,
        submittedById: user.id,
        section: {
            create: [
                {
                    title: "Main Section",
                    items: {
                        create: [
                            {
                                sl: 1,
                                unitPrice: 1500,
                                quantity: 1,
                                amount: 1500,
                                itemId: item.id,
                                description: "Sale Item"
                            }
                        ]
                    }
                }
            ]
        }
      },
      include: {
          section: { include: { items: true } }
      }
    });

    console.log(`✅ Quotation Created: ${quotation.quotationNumber}`);

    // 3. Trigger Sales Voucher Creation
    console.log("🔄 Triggering createSalesVoucherForQuotation...");
    const result = await createSalesVoucherForQuotation(
        quotation.id,
        quotation.quotationNumber,
        client.id,
        Number(quotation.grandTotal),
        user.id,
        new Date()
    );

    if (!result.success) {
        throw new Error(`Sales Process Failed: ${result.error}`);
    }

    console.log(`✅ Sales Voucher Created: ${result.voucherId}`);

    // 4. Verify Voucher & Accounting Entries
    const voucher = await prisma.voucher.findUnique({
        where: { id: result.voucherId! },
        include: {
            VoucherLine: { include: { ChartOfAccount: true } }
        }
    });

    if (!voucher) throw new Error("Voucher not found");

    console.log(`🔍 Voucher Type: ${voucher.type}`); // Should be SALES

    let cashAR = 0;
    let revenue = 0;
    let cogs = 0;
    let inventory = 0;

    console.log("Lines:");
    voucher.VoucherLine.forEach(line => {
        const name = line.ChartOfAccount.name;
        console.log(`  ${name} | DR: ${line.debitAmount} | CR: ${line.creditAmount}`);
        
        if (name.includes("Accounts Receivable")) cashAR += Number(line.debitAmount);
        if (name.includes("Sales")) revenue += Number(line.creditAmount);
        if (name.includes("Cost of Goods Sold")) cogs += Number(line.debitAmount);
        if (name.includes("Inventory Asset")) inventory += Number(line.creditAmount);
    });

    // Verify Amounts
    // Sale: 1500
    // Cost: 900
    if (cashAR === 1500 && revenue === 1500) {
        console.log("✅ Revenue Entry Correct (DR AR 1500, CR Sales 1500)");
    } else {
        console.error(`❌ Revenue Mismatch. DR AR: ${cashAR}, CR Sales: ${revenue}`);
    }

    if (cogs === 900 && inventory === 900) {
        console.log("✅ COGS Entry Correct (DR COGS 900, CR Inventory 900)");
    } else {
        console.error(`❌ COGS Mismatch. DR COGS: ${cogs}, CR Inventory: ${inventory}`);
    }

    // 5. Verify Inventory Stock
    const updatedItem = await prisma.item.findUnique({ where: { id: item.id } });
    console.log(`🔍 Verified Item Stock: Expected 9, Found ${updatedItem?.quantity}`);

    if (Number(updatedItem?.quantity) === 9) {
        console.log("✅ Stock Updated Correctly.");
    } else {
        console.error("❌ Stock Update Failed.");
    }

    // 6. Verify Creation of Inventory Transaction
     const stockTx = await prisma.inventoryTransaction.findFirst({
        where: {
            itemId: item.id,
            type: InventoryTransactionType.SALE,
            reference: voucher.id
        }
    });
    
    if (stockTx) {
         console.log("✅ Inventory Transaction Record Found.");
    } else {
         console.error("❌ Inventory Transaction Record Missing.");
    }

    console.log("------------------------");

  } catch (error) {
    console.error("❌ Trace Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

traceSalesFlow();
