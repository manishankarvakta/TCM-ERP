/**
 * Validate Payroll Settings Guard
 * Tests the payroll/accounting guard functionality for missing configurations.
 */

import { validateHRMAccountingSetup } from "../../lib/hr/payroll-settings-guard";
import { prisma } from "../../lib/prisma";

async function runTests() {
  console.log("🧪 Starting Payroll Settings Guard Validation Tests\n");

  // Step 1: Create a mock setup
  // We will intercept prisma.chartOfAccount.findUnique and getPayrollSettings temporarily,
  // or we can just mock `prisma.chartOfAccount.findUnique` natively.

  // Instead of mocking Prisma entirely which is hard, we can mock the `validateHRMAccountingSetup` behavior by temporarily pointing its DB queries or we just simulate the conditions.
  // Actually, we can just insert a few temporary dummy accounts and settings, then delete them!

  const testSessionId = `test_guard_${Date.now()}`;
  
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  // 1. Create dummy accounts
  const accExpense = await prisma.chartOfAccount.create({
    data: { name: "Test Salary Expense", code: `TST_EXP_${Date.now()}`, type: "EXPENSE", status: "active", createdBy: user.id }
  });
  
  const accPayable = await prisma.chartOfAccount.create({
    data: { name: "Test Salary Payable", code: `TST_PAY_${Date.now()}`, type: "LIABILITY", status: "active", createdBy: user.id }
  });

  const accAdvance = await prisma.chartOfAccount.create({
    data: { name: "Test Employee Advance", code: `TST_ADV_${Date.now()}`, type: "ASSET", status: "active", createdBy: user.id }
  });

  const accCash = await prisma.cashBankAccount.create({
    data: { 
      type: "CASH", 
      status: "active", 
      updatedAt: new Date(),
      User: { connect: { id: user.id } },
      ChartOfAccount: {
        create: {
          name: "Test Cash COA",
          code: `TST_CASH_${Date.now()}`,
          type: "ASSET",
          status: "active",
          createdBy: user.id
        }
      }
    }
  });

  // Mock accounting operation settings for payroll
  const mockSettings = {
    payroll: {
      salaryExpenseAccountId: accExpense.id,
      defaultSalaryPayableAccountId: accPayable.id,
      defaultAdvanceAccountId: accAdvance.id,
    }
  };

  // Create temporary accounting settings row
  const tempSettings = await prisma.settings.create({
    data: {
      title: "Test Accounting Operation Settings",
      code: "accounting.operationAccounts",
      category: "accounting",
      settings: mockSettings,
      isGlobal: true,
      isActive: true,
    }
  });

  try {
    console.log("✅ Test Data Setup Complete\n");

    // ============================================
    // Test Case 4: Valid setup
    // ============================================
    const res4 = await validateHRMAccountingSetup("PAYROLL_GENERATE");
    if (!res4.ok) throw new Error("Expected PAYROLL_GENERATE to be OK with valid settings. Errors: " + res4.errors.join(", "));
    console.log("✅ Test Case 4: Valid setup returns ok: true.");

    // ============================================
    // Test Case 1: Missing Salary Expense account (blocks posting)
    // ============================================
    // To simulate this, we can pass a bad override expense ID
    const res1 = await validateHRMAccountingSetup("PAYROLL_POST", { payrollId: "fake_id", salaryExpenseAccountId: "bad_id" });
    if (res1.ok) throw new Error("Expected PAYROLL_POST to block on invalid expense account");
    if (!res1.errors.join("").includes("Salary Expense account mapping is missing")) {
      throw new Error("Expected specific Salary Expense error, got: " + res1.errors.join(", "));
    }
    console.log("✅ Test Case 1: Missing Salary Expense account safely blocked posting.");

    // ============================================
    // Test Case 2 & 3: Missing Salary Payable & Advance account
    // ============================================
    // Temporarily delete the test settings and insert bad ones
    await prisma.settings.update({
      where: { id: tempSettings.id },
      data: {
        settings: {
          payroll: {
            salaryExpenseAccountId: accExpense.id,
            defaultSalaryPayableAccountId: "invalid_payable",
            defaultAdvanceAccountId: "invalid_advance",
          }
        }
      }
    });

    const res2 = await validateHRMAccountingSetup("EMPLOYEE_CREATE");
    if (res2.ok) throw new Error("Expected EMPLOYEE_CREATE to block on invalid payable/advance account");
    if (!res2.errors.join("").includes("HR accounting setup is incomplete")) {
       throw new Error("Expected specific incomplete setup error");
    }
    console.log("✅ Test Case 2 & 3: Missing Salary Payable or Advance account safely blocked employee creation.");

    // ============================================
    // Test Case 5: Invalid disbursement cash/bank account
    // ============================================
    const res5 = await validateHRMAccountingSetup("PAYROLL_DISBURSE", { cashBankAccountId: "invalid_cash_id" });
    if (res5.ok) throw new Error("Expected PAYROLL_DISBURSE to block on invalid cash account");
    if (!res5.errors.join("").includes("missing or inactive")) {
       throw new Error("Expected specific inactive/missing cash account error");
    }
    console.log("✅ Test Case 5: Invalid disbursement cash/bank account safely blocked disbursement.");

  } finally {
    // Cleanup
    await prisma.settings.delete({ where: { id: tempSettings.id } });
    await prisma.cashBankAccount.delete({ where: { id: accCash.id } });
    await prisma.chartOfAccount.deleteMany({
      where: { id: { in: [accExpense.id, accPayable.id, accAdvance.id, accCash.chartOfAccountId] } }
    });
    console.log("\n🧹 Cleanup complete.");
  }
}

runTests().catch(e => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
