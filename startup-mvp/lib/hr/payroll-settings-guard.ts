import { prisma } from "@/lib/prisma";
import { getPayrollSettings } from "@/lib/payroll-settings";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";

export type PayrollGuardContext =
  | "EMPLOYEE_CREATE"
  | "PAYROLL_GENERATE"
  | "PAYROLL_POST"
  | "PAYROLL_DISBURSE";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingAccounts: string[];
  missingSettings: string[];
}

export async function validateHRMAccountingSetup(
  context: PayrollGuardContext,
  data?: any
): Promise<ValidationResult> {
  const result: ValidationResult = {
    ok: true,
    errors: [],
    warnings: [],
    missingAccounts: [],
    missingSettings: [],
  };

  const accountingSettings = await getAccountingOperationSettings();
  const accounts = accountingSettings.payroll;

  // Helper to check if an account exists
  async function checkAccountExists(id: string, name: string) {
    if (!id) {
      result.missingSettings.push(name);
      result.errors.push(`Missing mapped account setting for: ${name}`);
      return false;
    }
    const acc = await prisma.chartOfAccount.findUnique({ where: { id } });
    if (!acc) {
      result.missingAccounts.push(name);
      result.errors.push(`Account mapped for ${name} does not exist in Chart of Accounts`);
      return false;
    }
    return true;
  }

  switch (context) {
    case "EMPLOYEE_CREATE": {
      const hasSalaryPayable = await checkAccountExists(accounts.defaultSalaryPayableAccountId, "Salary Payable Parent Account");
      const hasAdvance = await checkAccountExists(accounts.defaultAdvanceAccountId, "Employee Advance Parent Account");

      if (!hasSalaryPayable || !hasAdvance) {
        result.ok = false;
        result.errors.push("Employee cannot be created because HR accounting setup is incomplete. Please configure Salary Payable and Employee Advance parent accounts first.");
      }
      break;
    }

    case "PAYROLL_GENERATE": {
      // Basic check that settings exist and have primary accounts
      const hasSalaryExpense = await checkAccountExists(accounts.salaryExpenseAccountId, "Salary Expense Account");
      const hasSalaryPayable = await checkAccountExists(accounts.defaultSalaryPayableAccountId, "Salary Payable Parent Account");
      
      if (!hasSalaryExpense || !hasSalaryPayable) {
        result.ok = false;
        result.errors.push("Payroll cannot be generated because Payroll Settings are incomplete.");
      }
      break;
    }

    case "PAYROLL_POST": {
      // Required data: payrollId, optional: salaryExpenseAccountId
      const payrollId = data?.payrollId;
      const overrideExpenseId = data?.salaryExpenseAccountId;

      if (!payrollId) {
        result.ok = false;
        result.errors.push("Payroll ID is required for posting validation.");
        break;
      }

      // Check expense account
      const expenseId = overrideExpenseId || accounts.salaryExpenseAccountId;
      const hasExpense = await checkAccountExists(expenseId, "Salary Expense Account");

      if (!hasExpense) {
        result.ok = false;
        result.errors.push("Payroll cannot be posted because Salary Expense account mapping is missing.");
        break;
      }

      // We need to check the payroll items to see if employee specific accounts exist
      const payrollItems = await prisma.payrollItem.findMany({
        where: { payrollId },
        include: { employee: true }
      });

      if (payrollItems.length === 0) {
        result.ok = false;
        result.errors.push("Payroll cannot be posted because it has no items.");
        break;
      }

      let missingPayableCount = 0;
      let missingAdvanceCount = 0;

      for (const item of payrollItems) {
        // Assume employee.salaryPayableAccountId is used if available, or fallback to default
        // The project usually relies on employee.salaryPayableAccountId
        // Let's verify if the account exists
        const payableId = (item.employee as any).salaryPayableAccountId || accounts.defaultSalaryPayableAccountId;
        if (!payableId) {
          missingPayableCount++;
          continue;
        }
        
        const acc = await prisma.chartOfAccount.findUnique({ where: { id: payableId } });
        if (!acc) missingPayableCount++;

        const loanDeduction = Number(item.loanDeduction || 0);

        if (loanDeduction > 0) {
          const advanceId = (item.employee as any).advanceAccountId || accounts.defaultAdvanceAccountId;
          if (!advanceId) {
            missingAdvanceCount++;
          } else {
            const advAcc = await prisma.chartOfAccount.findUnique({ where: { id: advanceId } });
            if (!advAcc) missingAdvanceCount++;
          }
        }
      }

      if (missingPayableCount > 0) {
        result.ok = false;
        result.errors.push(`Payroll cannot be posted because Salary Payable account mapping is missing for ${missingPayableCount} employees.`);
      }

      if (missingAdvanceCount > 0) {
        result.ok = false;
        result.errors.push(`Payroll cannot be posted because Employee Advance account mapping is missing for ${missingAdvanceCount} employees with loan deductions.`);
      }

      break;
    }

    case "PAYROLL_DISBURSE": {
      const cashBankAccountId = data?.cashBankAccountId;
      
      if (!cashBankAccountId) {
        result.ok = false;
        result.errors.push("Payroll cannot be disbursed because the selected Cash/Bank account is missing or inactive.");
        break;
      }

      const account = await prisma.cashBankAccount.findUnique({
        where: { id: cashBankAccountId }
      });

      if (!account || account.status !== "active") {
        result.ok = false;
        result.errors.push("Payroll cannot be disbursed because the selected Cash/Bank account is missing or inactive.");
      }
      break;
    }
  }

  if (result.errors.length > 0) result.ok = false;

  return result;
}
