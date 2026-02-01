
import { prisma } from "@/lib/prisma";

async function verifyReconciliation() {
  console.log("📊 Starting System Reconciliation...\n");
  let errors: string[] = [];

  try {
    // ==================================================================================
    // 1. Inventory Qty (Stock vs Ledger)
    // ==================================================================================
    console.log("🔍 Test 1: Inventory Quantity (Stock vs Ledger)...");
    const items = await prisma.item.findMany({ select: { id: true, code: true, quantity: true } });
    
    // Group transactions by item
    const txAggregates = await prisma.inventoryTransaction.groupBy({
        by: ['itemId'],
        _sum: { quantity: true }
    });

    for (const item of items) {
        const tx = txAggregates.find(t => t.itemId === item.id);
        const txQty = tx?._sum.quantity?.toNumber() || 0;
        const itemQty = item.quantity.toNumber();

        if (Math.abs(txQty - itemQty) > 0.001) {
            errors.push(`[InvQty] Mismatch Item ${item.code}: Stock=${itemQty}, Ledger=${txQty}`);
        }
    }
    console.log(`   Checked ${items.length} items.`);


    // ==================================================================================
    // 2. Inventory Value (GL vs Valuation)
    // ==================================================================================
    console.log("\n🔍 Test 2: Inventory Value (GL vs Valuation)...");
    const invAccount = await prisma.chartOfAccount.findFirst({ 
        where: { name: "Inventory Asset" },
        include: { JournalEntryLine: true }
    });

    if (invAccount) {
        const glDebit = invAccount.JournalEntryLine.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
        const glCredit = invAccount.JournalEntryLine.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);
        const glBalance = glDebit - glCredit;

        // Calculate Valuation (Qty * Cost)
        // Re-fetch items with costPrice
        const itemsWithCost = await prisma.item.findMany({ select: { quantity: true, costPrice: true } });
        const validationValue = itemsWithCost.reduce((sum, item) => {
            return sum + (item.quantity.toNumber() * item.costPrice.toNumber());
        }, 0);

        console.log(`   GL Balance: ${glBalance.toFixed(2)} | Stock Valuation: ${validationValue.toFixed(2)}`);

        if (Math.abs(glBalance - validationValue) > 1.0) { // Tolerance $1
             errors.push(`[InvValue] GL Balance (${glBalance}) != Stock Valuation (${validationValue})`);
        }
    } else {
        errors.push("[InvValue] 'Inventory Asset' account not found.");
    }


    // ==================================================================================
    // 3. AP Aging (GL Control vs Supplier Sub-Ledger)
    // ==================================================================================
    console.log("\n🔍 Test 3: AP Aging (GL Control vs Sub-Ledger)...");
    const apAccount = await prisma.chartOfAccount.findFirst({ 
        where: { name: "Accounts Payable" },
        include: { JournalEntryLine: true }
    });

    if (apAccount) {
        const glDebit = apAccount.JournalEntryLine.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
        const glCredit = apAccount.JournalEntryLine.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);
        const glBalance = glCredit - glDebit; // Liability: Credit - Debit

        // Calculate Sub-Ledger from Lines
        // Filter lines with supplierId
        const supplierLines = apAccount.JournalEntryLine.filter(l => l.supplierId);
        const nonSupplierLines = apAccount.JournalEntryLine.filter(l => !l.supplierId);

        if (nonSupplierLines.length > 0) {
             errors.push(`[AP] Found ${nonSupplierLines.length} journal lines in AP without supplierId (Clean data violation).`);
        }

        const subLedgerBalance = supplierLines.reduce((sum, line) => {
            return sum + (line.creditAmount.toNumber() - line.debitAmount.toNumber());
        }, 0);

        console.log(`   GL Control: ${glBalance.toFixed(2)} | Sub-Ledger Sum: ${subLedgerBalance.toFixed(2)}`);

        if (Math.abs(glBalance - subLedgerBalance) > 0.01) {
             errors.push(`[AP] GL Control (${glBalance}) != Sub-Ledger Sum (${subLedgerBalance})`);
        }
    } else {
        errors.push("[AP] 'Accounts Payable' account not found.");
    }


    // ==================================================================================
    // 4. AR Aging (GL Control vs Client Sub-Ledger)
    // ==================================================================================
    console.log("\n🔍 Test 4: AR Aging (GL Control vs Sub-Ledger)...");
    const arAccount = await prisma.chartOfAccount.findFirst({ 
        where: { name: "Accounts Receivable" },
        include: { JournalEntryLine: true }
    });

    if (arAccount) {
        const glDebit = arAccount.JournalEntryLine.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
        const glCredit = arAccount.JournalEntryLine.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);
        const glBalance = glDebit - glCredit; // Asset: Debit - Credit

        // Calculate Sub-Ledger from Lines
        const clientLines = arAccount.JournalEntryLine.filter(l => l.clientId);
        const nonClientLines = arAccount.JournalEntryLine.filter(l => !l.clientId);

        if (nonClientLines.length > 0) {
             errors.push(`[AR] Found ${nonClientLines.length} journal lines in AR without clientId.`);
        }

        const subLedgerBalance = clientLines.reduce((sum, line) => {
             return sum + (line.debitAmount.toNumber() - line.creditAmount.toNumber());
        }, 0);

        console.log(`   GL Control: ${glBalance.toFixed(2)} | Sub-Ledger Sum: ${subLedgerBalance.toFixed(2)}`);

        if (Math.abs(glBalance - subLedgerBalance) > 0.01) {
             errors.push(`[AR] GL Control (${glBalance}) != Sub-Ledger Sum (${subLedgerBalance})`);
        }
    } else {
        errors.push("[AR] 'Accounts Receivable' account not found.");
    }


    // ==================================================================================
    // 5. Cash/Bank (GL vs CashBook)
    // ==================================================================================
    console.log("\n🔍 Test 5: Cash/Bank (GL vs CashBook Balance)...");
    const cashBankAccounts = await prisma.cashBankAccount.findMany({
        include: { ChartOfAccount: { include: { JournalEntryLine: true } } }
    });

    for (const cb of cashBankAccounts) { // Fixed variable name
        const glDebit = cb.ChartOfAccount.JournalEntryLine.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
        const glCredit = cb.ChartOfAccount.JournalEntryLine.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);
        const glBalance = glDebit - glCredit; 
        
        // CashBook balance (from field) - assuming usage of simple number or decimal
        // Wait, schema says balance is Int? Or Decimal? Let's assume Decimal from seeding.
        // Or if it's missing in schema (I removed it from seed script earlier because lint said it doesn't exist!)
        // WAIT. I removed 'balance' from seed script because it DOES NOT EXIST on CashBankAccount model.
        // So I cannot verify against a field that doesn't exist.
        // I must rely on GL being the source of truth OR if there is another way.
        // The user asked "Cash/Bank vs payment vouchers". 
        // So GL = Sum(Vouchers linked to this account).
        
        // Let's verify GL vs Sum of VoucherLines that target this account.
        // Actually JournalEntryLine IS derived from VoucherLine.
        // So this check is effectively: Did all VoucherLines get posted to JournalEntryLines correctly?
        
        // New Strategy for Test 5: Compare VoucherLine Sum vs JournalEntryLine Sum
        // This validates "Posting Logic".
        
        const voucherLineSum = await prisma.voucherLine.aggregate({
            where: { chartOfAccountId: cb.chartOfAccountId },
            _sum: { debitAmount: true, creditAmount: true }
        });
        
        const vlDebit = voucherLineSum._sum.debitAmount?.toNumber() || 0;
        const vlCredit = voucherLineSum._sum.creditAmount?.toNumber() || 0;
        const vlBalance = vlDebit - vlCredit;

        console.log(`   Account ${cb.ChartOfAccount.name}: GL=${glBalance.toFixed(2)} | Vouchers=${vlBalance.toFixed(2)}`);
        
        if (Math.abs(glBalance - vlBalance) > 0.01) {
             errors.push(`[CashBank] ${cb.ChartOfAccount.name} Mismatch: GL(${glBalance}) != Vouchers(${vlBalance})`);
        }
    }


    // ==================================================================================
    // Report
    // ==================================================================================
    console.log("\n---------------------------------------------------");
    if (errors.length === 0) {
        console.log("✅ RECONCILIATION SUCCESSFUL: All tests passed.");
    } else {
        console.error(`❌ RECONCILIATION FAILED with ${errors.length} errors:`);
        errors.forEach(e => console.error("   - " + e));
    }
    console.log("---------------------------------------------------\n");

  } catch (error) {
    console.error("Critical Error during reconciliation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyReconciliation();
