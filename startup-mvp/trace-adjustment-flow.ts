
import { prisma } from "@/lib/prisma";
import { adjustInventory } from "./app/actions/adjustment-accounting-integration";
import { VoucherType } from "@prisma/client";
import { randomUUID } from "crypto";

async function traceAdjustmentFlow() {
  console.log("🚀 Starting Inventory Adjustment Trace...");

  try {
    // 1. Setup: Ensure User & Item exist
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");

    // Create Item (Cost: 500)
    const item = await prisma.item.create({
      data: {
        code: `ADJ-ITEM-${Date.now()}`,
        description: "Adjustment Test Item",
        costPrice: 500,
        unitPrice: 1000,
        quantity: 10,
        status: "active",
        unitId: (await prisma.unit.findFirst())?.id || "default_unit",
      }
    });

    console.log(`✅ Item Created: ${item.code} (Stock: 10, Cost: 500)`);

    // 2. Scenario A: Loss (Qty -1)
    // Expect: DR Adjustment / CR Inventory
    console.log("🔄 Adjusting Stock: -1 (Loss/Damage)...");
    
    const lossResult = await adjustInventory(
        item.id,
        -1, 
        "Damaged in transit",
        user.id
    );

    if (!lossResult.success) throw new Error(`Loss Adjustment Failed: ${lossResult.error}`);

    const lossVoucher = await prisma.voucher.findUnique({
        where: { id: lossResult.voucherId! },
        include: { VoucherLine: { include: { ChartOfAccount: true } } }
    });

    console.log(`✅ Loss Voucher: ${lossVoucher?.voucherNumber}`);
    
    let drAdj_Loss = 0;
    let crInv_Loss = 0;

    lossVoucher?.VoucherLine.forEach(line => {
        if (line.ChartOfAccount.name.includes("Adjustment")) drAdj_Loss += Number(line.debitAmount);
        if (line.ChartOfAccount.name.includes("Inventory Asset")) crInv_Loss += Number(line.creditAmount);
    });

    if (drAdj_Loss === 500 && crInv_Loss === 500) {
        console.log("✅ Loss Accounting Correct (DR Adjustment 500 / CR Inventory 500)");
    } else {
        console.error(`❌ Loss Accounting Mismatch. DR Adj: ${drAdj_Loss}, CR Inv: ${crInv_Loss}`);
    }

    // 3. Scenario B: Gain (Qty +2)
    // Expect: DR Inventory / CR Adjustment
    console.log("🔄 Adjusting Stock: +2 (Found extra)...");
    
    const gainResult = await adjustInventory(
        item.id,
        2, 
        "Found during count",
        user.id
    );

    if (!gainResult.success) throw new Error(`Gain Adjustment Failed: ${gainResult.error}`);

    const gainVoucher = await prisma.voucher.findUnique({
        where: { id: gainResult.voucherId! },
        include: { VoucherLine: { include: { ChartOfAccount: true } } }
    });

    console.log(`✅ Gain Voucher: ${gainVoucher?.voucherNumber}`);

    let drInv_Gain = 0;
    let crAdj_Gain = 0;

    gainVoucher?.VoucherLine.forEach(line => {
        if (line.ChartOfAccount.name.includes("Inventory Asset")) drInv_Gain += Number(line.debitAmount);
        if (line.ChartOfAccount.name.includes("Adjustment")) crAdj_Gain += Number(line.creditAmount);
    });

    if (drInv_Gain === 1000 && crAdj_Gain === 1000) { // 2 * 500
        console.log("✅ Gain Accounting Correct (DR Inventory 1000 / CR Adjustment 1000)");
    } else {
        console.error(`❌ Gain Accounting Mismatch. DR Inv: ${drInv_Gain}, CR Adj: ${crAdj_Gain}`);
    }

    // 4. Verify Final Stock
    const finalItem = await prisma.item.findUnique({ where: { id: item.id } });
    // Initial 10 - 1 + 2 = 11
    console.log(`🔍 Final Stock: Expected 11, Found ${finalItem?.quantity}`);
    
    if (Number(finalItem?.quantity) === 11) {
        console.log("✅ Stock Level Correct.");
    } else {
        console.error("❌ Stock Level Incorrect.");
    }

    console.log("--------------------");

  } catch (error) {
    console.error("❌ Trace Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

traceAdjustmentFlow();
