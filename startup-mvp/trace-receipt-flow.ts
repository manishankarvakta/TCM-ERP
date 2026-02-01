
import { prisma } from "@/lib/prisma";
import { AccountType, VoucherType } from "@prisma/client";
import { randomUUID } from "crypto";

async function traceReceiptFlow() {
  console.log("🚀 Starting Sales Receipt Trace...");

  try {
    // 1. Setup: Ensure User exists
    const user = await prisma.user.findFirst();
    if (!user) throw new Error("No user found");

    // 2. Create Client (Triggers COA creation)
    const clientEmail = `trace-receipt-client-${Date.now()}@example.com`;
    console.log(`Creating Client with email: ${clientEmail}`);
    
    // 2a. Find/Create AR Parent
    let arParent = await prisma.chartOfAccount.findFirst({
      where: { name: { contains: "Accounts Receivable" }, type: AccountType.ASSET }
    });

    if (!arParent) {
      console.log("Creating AR Parent...");
      arParent = await prisma.chartOfAccount.create({
        data: {
          id: randomUUID(),
          code: `A-AR-${Date.now()}`,
          name: "Accounts Receivable",
          type: AccountType.ASSET,
          createdBy: user.id,
          updatedAt: new Date()
        }
      });
    }

    // 2b. Create Client COA
    const clientCOA = await prisma.chartOfAccount.create({
      data: {
        id: randomUUID(),
        code: `AR-CLI-${Date.now()}`,
        name: `AR - Trace Client ${Date.now()}`,
        type: AccountType.ASSET,
        parentId: arParent.id,
        status: "active",
        createdBy: user.id,
        updatedAt: new Date()
      }
    });

    // 2c. Create Client
    const client = await prisma.client.create({
      data: {
        name: `Trace Receipt Client ${Date.now()}`,
        email: clientEmail,
        status: "active",
        createdBy: user.id,
        chartOfAccountId: clientCOA.id
      }
    });

    console.log(`✅ Client Setup Complete. AR Account: ${clientCOA.name} (${clientCOA.id})`);

    // 3. Create Bank Account (Asset)
    const bankAccount = await prisma.chartOfAccount.create({
      data: {
        id: randomUUID(),
        code: `BANK-REC-${Date.now()}`,
        name: `Trace Receipt Bank ${Date.now()}`,
        type: AccountType.ASSET,
        status: "active",
        createdBy: user.id,
        updatedAt: new Date()
      }
    });
    console.log(`✅ Bank Account Created: ${bankAccount.name}`);

    // 4. Create RECEIPT Voucher
    // Scenario: Customer pays 1500
    // DR: Bank (Asset Up)
    // CR: AR - Client (Asset Down)
    
    console.log("🔄 Attempting to create RECEIPT Voucher...");

    const voucherData = {
      type: "RECEIPT",
      date: new Date(),
      lines: [
        {
          lineNumber: 1,
          debitAmount: 1500,
          creditAmount: 0,
          chartOfAccountId: bankAccount.id, // DR Bank
          description: "Payment from Customer"
        },
        {
          lineNumber: 2,
          debitAmount: 0,
          creditAmount: 1500,
          chartOfAccountId: clientCOA.id, // CR Client AR
          description: "AR Clearing"
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
    
    const restrictedMatches = usedAccounts.filter(acc => RESTRICTED_ACCOUNTS.includes(acc.name));
    if (restrictedMatches.length > 0) {
      throw new Error(`Restricted Account Blocked: ${restrictedMatches.map(a => a.name).join(", ")}`);
    }
    // -----------------------------------------------------

    console.log("✅ Validation Logic Passed (Simulation). Proceeding to DB creation...");

    const voucherNumber = `VCH-REC-${Date.now()}`;
    const voucher = await prisma.voucher.create({
      data: {
        id: randomUUID(),
        updatedAt: new Date(),
        voucherNumber,
        date: new Date(),
        type: VoucherType.RECEIPT,
        status: "posted", // Simulate posted
        createdBy: user.id,
        postedById: user.id,
        postedAt: new Date(),
        clientId: client.id,
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

    console.log(`✅ Receipt Voucher Created: ${voucher.voucherNumber}`);

    // 5. Verify Balances
    // Calculate balances from Journal Entries
    const clientBalance = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: clientCOA.id },
      _sum: { debitAmount: true, creditAmount: true }
    });

    const bankBalance = await prisma.journalEntryLine.aggregate({
      where: { chartOfAccountId: bankAccount.id },
      _sum: { debitAmount: true, creditAmount: true }
    });

    console.log("\n--- VERIFICATION ---");
    console.log("Client AR Account (Asset):");
    console.log(`  DR: ${clientBalance._sum.debitAmount || 0}`);
    console.log(`  CR: ${clientBalance._sum.creditAmount || 0}`);
    
    // Net Asset = Debit - Credit. 
    // If we received 1500, we Credited 1500.
    // If there was no opening balance, Asset is now -1500 (Advance Receipt/Overpayment).
    const receivablesBalance = Number(clientBalance._sum.debitAmount || 0) - Number(clientBalance._sum.creditAmount || 0);
    console.log(`  Net Receivables Balance: ${receivablesBalance}`);
    
    console.log("Bank Account (Asset):");
    console.log(`  DR: ${bankBalance._sum.debitAmount || 0}`);
    console.log(`  CR: ${bankBalance._sum.creditAmount || 0}`);
    // Net Asset = Debit - Credit.
    const bankAssetBalance = Number(bankBalance._sum.debitAmount || 0) - Number(bankBalance._sum.creditAmount || 0);
    console.log(`  Net Bank Balance: ${bankAssetBalance}`);

    if (receivablesBalance === -1500 && bankAssetBalance === 1500) {
      console.log("✅ Balances Correct for Start-from-Zero scenario (Advance/Overpayment created)");
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

traceReceiptFlow();
