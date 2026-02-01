
import { prisma } from "@/lib/prisma";
import { validateAccountRestrictions } from "./app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";

async function traceJournalRestrictions() {
  console.log("🚀 Starting Journal Restriction Trace (Validation Only)...");

  try {
    // 1. Fetch Accounts
    const inventoryAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Inventory Asset" } });
    const bankAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Bank" } }); 
    const expenseAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Inventory Adjustment Gain/Loss" } }); 
    const salesAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Sales" } });

    if (!inventoryAccount || !bankAccount || !expenseAccount || !salesAccount) {
        throw new Error("Missing required accounts for trace");
    }

    console.log(`Accounts Found:
      Inventory (Control): ${inventoryAccount.id}
      Bank (Classified): ${bankAccount.id}
      Expense (General): ${expenseAccount.id}
      Sales (General): ${salesAccount.id}
    `);

    // 2. Attempt Control Account Check
    console.log("\n🔄 Test 1: Checking Inventory (Control Account)...");
    const controlTest = await validateAccountRestrictions([inventoryAccount.id, salesAccount.id]);

    if (controlTest.valid) {
        console.error("❌ Test 1 FAILED: Control Account restriction bypassed.");
    } else {
        console.log(`✅ Test 1 PASSED: Blocked with error -> "${controlTest.error}"`);
    }

    // 3. Attempt Bank Account Check
    console.log("\n🔄 Test 2: Checking Bank (Cash/Bank Account)...");
    const bankTest = await validateAccountRestrictions([bankAccount.id, salesAccount.id]);

    if (bankTest.valid) {
         console.error("❌ Test 2 FAILED: Bank Account restriction bypassed.");
    } else {
         console.log(`✅ Test 2 PASSED: Blocked with error -> "${bankTest.error}"`);
    }

    // 4. Attempt Valid Check
    console.log("\n🔄 Test 3: Checking Valid Accounts...");
    const validTest = await validateAccountRestrictions([expenseAccount.id, salesAccount.id]);

    if (validTest.valid) {
         console.log(`✅ Test 3 PASSED: Validation successful.`);
    } else {
         console.error(`❌ Test 3 FAILED: Valid accounts rejected -> "${validTest.error}"`);
    }

    console.log("\n---------------------------------");

  } catch (error) {
    console.error("❌ Trace Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

traceJournalRestrictions();
