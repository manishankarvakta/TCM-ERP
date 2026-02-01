
import { prisma } from "@/lib/prisma";
import { createVoucher } from "./app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { createSupplier } from "./app/(dashboard)/dashboard/suppliers/_actions/supplier.action";
import { AccountType, VoucherType } from "@prisma/client";
import { randomUUID } from "crypto";

async function tracePaymentFlow() {
  console.log("🚀 Starting Purchase Payment Trace...");

  try {
    // 1. Setup: Ensure User exists
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");

    // 2. Create Supplier (Triggers COA creation)
    const supplierEmail = `trace-pay-supplier-${Date.now()}@example.com`;
    console.log(`Creating Supplier with email: ${supplierEmail}`);
    
    // 2a. Find/Create AP Parent
    let apParent = await prisma.chartOfAccount.findFirst({
      where: { name: { contains: "Accounts Payable" }, type: AccountType.LIABILITY }
    });

    if (!apParent) {
      console.log("Creating AP Parent...");
      apParent = await prisma.chartOfAccount.create({
        data: {
          id: randomUUID(),
          code: `L-AP-${Date.now()}`,
          name: "Accounts Payable",
          type: AccountType.LIABILITY,
          createdBy: user.id,
          updatedAt: new Date()
        }
      });
    }

    // 2b. Create Supplier COA
    const supplierCOA = await prisma.chartOfAccount.create({
      data: {
        id: randomUUID(),
        code: `AP-SUP-${Date.now()}`,
        name: `AP - Trace Supplier ${Date.now()}`,
        type: AccountType.LIABILITY,
        parentId: apParent.id,
        status: "active",
        createdBy: user.id,
        updatedAt: new Date()
      }
    });

    // 2c. Create Supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: `Trace Supplier ${Date.now()}`,
        email: supplierEmail,
        status: "active",
        createdBy: user.id,
        chartOfAccountId: supplierCOA.id
      }
    });

    console.log(`✅ Supplier Setup Complete. AP Account: ${supplierCOA.name} (${supplierCOA.id})`);

    // 3. Create Bank Account (Asset)
    const bankAccount = await prisma.chartOfAccount.create({
      data: {
        id: randomUUID(),
        code: `BANK-${Date.now()}`,
        name: `Trace Bank ${Date.now()}`,
        type: AccountType.ASSET,
        status: "active",
        createdBy: user.id,
        updatedAt: new Date()
      }
    });
    console.log(`✅ Bank Account Created: ${bankAccount.name}`);

    // 4. Create Payment Voucher
    console.log("🔄 Attempting to create PAYMENT Voucher...");

    const voucherData = {
      type: "PAYMENT",
      date: new Date(),
      lines: [
        {
          lineNumber: 1,
          debitAmount: 1000,
          creditAmount: 0,
          chartOfAccountId: supplierCOA.id, // DR Supplier AP
          description: "Payment to Supplier"
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: 1000,
          chartOfAccountId: bankAccount.id, // CR Bank
          description: "Bank Transfer"
        }
      ]
    };

    // --- VALIDATION REPLICATION ---
    const SYSTEM_TYPES = ["SALES", "PURCHASE"];
    if (SYSTEM_TYPES.includes(voucherData.type)) throw new Error("Blocked System Type");

    const RESTRICTED_ACCOUNTS = ["Inventory Asset", "Accounts Receivable", "Accounts Payable"];
    const usedAccounts = await prisma.chartOfAccount.findMany({
      where: { id: { in: voucherData.lines.map(l => l.chartOfAccountId) } }
    });
    
    // Strict name check - assumes system blocks exact matches only or knows about sub-accounts
    // In our manual test, we are checking if "AP - Trace Supplier" is blocked.
    // Since it's NOT in RESTRICTED_ACCOUNTS list strictly, it should pass.
    
    const restrictedMatches = usedAccounts.filter(acc => RESTRICTED_ACCOUNTS.includes(acc.name));
    if (restrictedMatches.length > 0) {
      throw new Error(`Restricted Account Blocked: ${restrictedMatches.map(a => a.name).join(", ")}`);
    }
    // -----------------------------------------------------

    console.log("✅ Validation Logic Passed (Simulation). Proceeding to DB creation...");

    const voucherNumber = `VCH-TRACE-${Date.now()}`;
    const voucher = await prisma.voucher.create({
      data: {
        id: randomUUID(),
        updatedAt: new Date(),
        voucherNumber,
        date: new Date(),
        type: VoucherType.PAYMENT,
        status: "posted", // Simulate posted
        createdBy: user.id,
        postedById: user.id,
        postedAt: new Date(),
        supplierId: supplier.id,
        VoucherLine: {
          create: voucherData.lines.map(l => ({
             id: randomUUID(),
             updatedAt: new Date(),
             lineNumber: l.lineNumber,
             debitAmount: l.debitAmount,
             creditAmount: l.creditAmount,
             chartOfAccountId: l.chartOfAccountId,
             description: l.description
          }))
        }
      }
    });

    // Create Journal Entry
    await prisma.journalEntry.create({
      data: {
        id: randomUUID(),
        entryNumber: `JE-${voucherNumber}`,
        date: new Date(),
        voucherId: voucher.id,
        status: "posted",
        createdBy: user.id,
        postedBy: user.id,
        postedAt: new Date(),
        JournalEntryLine: {
          create: voucherData.lines.map(l => ({
             id: randomUUID(),
             lineNumber: l.lineNumber,
             debitAmount: l.debitAmount,
             creditAmount: l.creditAmount,
             chartOfAccountId: l.chartOfAccountId,
             description: l.description
          }))
        }
      }
    });

    console.log(`✅ Payment Voucher Created: ${voucher.voucherNumber}`);

    // 5. Verify Balances
    // Calculate balances from Journal Entries
    const supplierBalance = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: supplierCOA.id },
      _sum: { debitAmount: true, creditAmount: true }
    });

    const bankBalance = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: bankAccount.id },
      _sum: { debitAmount: true, creditAmount: true }
    });

    console.log("\n--- VERIFICATION ---");
    console.log("Supplier AP Account (Liability):");
    console.log(`  DR: ${supplierBalance._sum.debitAmount || 0}`);
    console.log(`  CR: ${supplierBalance._sum.creditAmount || 0}`);
    
    // Net Liability = Credit - Debit. 
    // If we paid 1000, we Debited 1000. 
    // If there was no opening balance, Liability is now -1000 (Advance Payment).
    const liabilityBalance = Number(supplierBalance._sum.creditAmount || 0) - Number(supplierBalance._sum.debitAmount || 0);
    console.log(`  Net Liability Balance: ${liabilityBalance}`);
    
    console.log("Bank Account (Asset):");
    console.log(`  DR: ${bankBalance._sum.debitAmount || 0}`);
    console.log(`  CR: ${bankBalance._sum.creditAmount || 0}`);
    // Net Asset = Debit - Credit.
    const assetBalance = Number(bankBalance._sum.debitAmount || 0) - Number(bankBalance._sum.creditAmount || 0);
    console.log(`  Net Asset Balance: ${assetBalance}`);

    if (liabilityBalance === -1000 && assetBalance === -1000) {
      console.log("✅ Balances Correct for Start-from-Zero scenario (Advance Payment created)");
    } else {
       console.log("⚠️ Balances need context verification. Ensure logic holds.");
    }

    console.log("--------------------");

  } catch (error) {
    console.error("❌ Trace Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

tracePaymentFlow();
