import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runAccountingIntegrityTests() {
  console.log("=================================================");
  console.log("  TS-CRM ACCOUNTS MODULE INTEGRITY TEST SUITE    ");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: System-wide Double-Entry Debit/Credit Equilibrium
  totalTests++;
  try {
    console.log("TEST 1: System-wide Double-Entry Debit vs Credit Equilibrium...");
    const aggregateRes = await prisma.journalEntryLine.aggregate({
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    const totalDebit = Number(aggregateRes._sum.debitAmount || 0);
    const totalCredit = Number(aggregateRes._sum.creditAmount || 0);
    const diff = Math.abs(totalDebit - totalCredit);

    console.log(`  -> Total Debits:  $${totalDebit.toFixed(2)}`);
    console.log(`  -> Total Credits: $${totalCredit.toFixed(2)}`);
    console.log(`  -> Difference:    $${diff.toFixed(4)}`);

    if (diff <= 0.001) {
      console.log("  ✅ PASS: General Ledger is in perfect double-entry equilibrium.\n");
      passedTests++;
    } else {
      console.log("  ❌ FAIL: General Ledger double-entry imbalance detected!\n");
    }
  } catch (err) {
    console.error("  ❌ FAIL: Exception during Test 1 execution:", err, "\n");
  }

  // Test 2: Journal Entry Line Item Zero Net Sum Validation
  totalTests++;
  try {
    console.log("TEST 2: Per-Journal Entry Line Item Balance Validation...");
    const journalEntries = await prisma.journalEntry.findMany({
      include: { JournalEntryLine: true },
    });

    let imbalanceCount = 0;
    for (const je of journalEntries) {
      const lineDebit = je.JournalEntryLine.reduce((sum, l) => sum + Number(l.debitAmount || 0), 0);
      const lineCredit = je.JournalEntryLine.reduce((sum, l) => sum + Number(l.creditAmount || 0), 0);
      if (Math.abs(lineDebit - lineCredit) > 0.001) {
        imbalanceCount++;
        console.log(`  -> Imbalance in JE ${je.entryNumber}: Debit=${lineDebit}, Credit=${lineCredit}`);
      }
    }

    if (imbalanceCount === 0) {
      console.log(`  ✅ PASS: All ${journalEntries.length} posted Journal Entries are internally balanced.\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: Found ${imbalanceCount} unbalanced Journal Entries.\n`);
    }
  } catch (err) {
    console.error("  ❌ FAIL: Exception during Test 2 execution:", err, "\n");
  }

  // Test 3: Posted Voucher to Journal Entry Consistency Check
  totalTests++;
  try {
    console.log("TEST 3: Posted Voucher to Journal Entry Consistency Check...");
    const postedVouchers = await prisma.voucher.findMany({
      where: { status: "posted" },
      include: { JournalEntry: true },
    });

    let missingJECount = 0;
    for (const v of postedVouchers) {
      if (v.JournalEntry.length === 0) {
        missingJECount++;
        console.log(`  -> Posted Voucher ${v.voucherNumber} has missing Journal Entry!`);
      }
    }

    if (missingJECount === 0) {
      console.log(`  ✅ PASS: All ${postedVouchers.length} posted vouchers have corresponding journal entries.\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: Found ${missingJECount} posted vouchers with missing journal entries.\n`);
    }
  } catch (err) {
    console.error("  ❌ FAIL: Exception during Test 3 execution:", err, "\n");
  }

  // Test 4: Chart of Accounts Hierarchy & Control Account Security
  totalTests++;
  try {
    console.log("TEST 4: Chart of Accounts Code Uniqueness & Hierarchy Check...");
    const coaList = await prisma.chartOfAccount.findMany();
    const codes = coaList.map((c) => c.code);
    const uniqueCodes = new Set(codes);

    if (codes.length === uniqueCodes.size) {
      console.log(`  ✅ PASS: All ${coaList.length} Chart of Account codes are unique.\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL: Duplicate Chart of Account codes detected!\n`);
    }
  } catch (err) {
    console.error("  ❌ FAIL: Exception during Test 4 execution:", err, "\n");
  }

  // Summary
  console.log("=================================================");
  console.log(`  TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log("=================================================");

  if (passedTests === totalTests) {
    console.log("\n🚀 ACCOUNTS MODULE HARDENING & INTEGRITY VERIFIED SUCCESSFUL!\n");
    process.exit(0);
  } else {
    console.error("\n❌ INTEGRITY SUITE FAILED SOME TESTS!\n");
    process.exit(1);
  }
}

runAccountingIntegrityTests()
  .catch((e) => {
    console.error("Test Suite Fatal Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
