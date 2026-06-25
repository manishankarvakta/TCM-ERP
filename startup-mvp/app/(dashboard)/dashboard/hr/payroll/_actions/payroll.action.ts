"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logItemCreated, logItemUpdated } from "@/lib/user-log";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { Prisma, PayrollStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { createVoucher, postVoucher, cancelVoucher } from "../../../accounts/vouchers/_actions/voucher.action";
import { getPayrollSettings } from "@/lib/payroll-settings";
import { getAccountingOperationSettings } from "@/lib/accounting-settings";
import { validateHRMAccountingSetup } from "@/lib/hr/payroll-settings-guard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies the configured net pay rounding rule.
 * "none"       = no rounding
 * "nearest10"  = round to nearest 10
 * "nearest100" = round to nearest 100
 */
function applyNetPayRounding(value: number, mode: string): number {
  if (mode === "nearest10")  return Math.round(value / 10) * 10;
  if (mode === "nearest100") return Math.round(value / 100) * 100;
  return value;
}


/**
 * Generate a new Payroll for a given month and year
 */
/**
 * Generate options for payroll.
 * includeFestivalBonus: if true, adds defaultFestivalBonusPct of basic as bonus for all employees.
 */
export interface GeneratePayrollOptions {
  includeFestivalBonus?: boolean;
}

export async function generatePayroll(month: number, year: number, options?: GeneratePayrollOptions) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const canCreate = await hasPermission(session.user.id, "hr.payroll", "create");
    if (!canCreate) {
      return { success: false, error: "You do not have permission to generate payroll" };
    }

    // Validate HR Accounting Setup Guard
    const hrGuard = await validateHRMAccountingSetup("PAYROLL_GENERATE");
    if (!hrGuard.ok) {
      return { success: false, error: hrGuard.errors.join(". ") };
    }

    // Check if payroll already exists for this month/year
    const existingPayroll = await prisma.payroll.findFirst({
      where: { month, year, isTrash: false },
    });

    if (existingPayroll) {
      return { success: false, error: `Payroll already generated for ${month}/${year}` };
    }

    // Get all active employees with their salary info
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
    });

    if (employees.length === 0) {
      return { success: false, error: "No active employees found to generate payroll for" };
    }

    // Load payroll settings for calculation rules
    const payrollSettings = await getPayrollSettings();
    const calc = payrollSettings.calculation;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Backend Safety: Check and log attendance warnings
    try {
      const { getPayrollAttendanceWarnings } = await import("@/lib/hr/payroll/attendance-warnings");
      const warningCheck = await getPayrollAttendanceWarnings({ fromDate: startDate, toDate: endDate });
      if (warningCheck.warnings.length > 0) {
        console.warn(`[PAYROLL] Generating payroll for ${month}/${year} with ${warningCheck.warnings.length} unresolved attendance warnings.`);
      }
    } catch (warnErr) {
      console.error("[PAYROLL] Failed to check attendance warnings:", warnErr);
    }

    const calendarDaysInMonth = endDate.getDate();
    // Divisor for daily rate: configurable (calendar vs fixed working days)
    const payDivisor =
      calc.absentDeductionMode === "working"
        ? calc.standardWorkingDays
        : calendarDaysInMonth;

    // Fetch Attendance
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        leaveApplication: {
          include: { leaveType: true }
        }
      }
    });

    // Group attendance by employee
    const attendanceByEmployee = attendanceRecords.reduce((acc, curr) => {
      if (!acc[curr.employeeId]) {
        acc[curr.employeeId] = { absentDays: 0, otHours: 0 };
      }
      
      if (curr.status === "ABSENT") {
        acc[curr.employeeId].absentDays += 1;
      } else if (curr.status === "HALF_DAY") {
        acc[curr.employeeId].absentDays += 0.5;
      } else if (curr.status === "LEAVE") {
        // Only deduct if leave is unpaid
        const isPaid = curr.leaveApplication?.leaveType?.isPaid ?? true;
        if (!isPaid) {
          acc[curr.employeeId].absentDays += 1;
        }
      }
      
      acc[curr.employeeId].otHours += Number(curr.otHours) || 0;
      return acc;
    }, {} as Record<string, { absentDays: number; otHours: number }>);

    // Fetch active loans
    const loans = await prisma.employeeLoan.findMany({
      where: {
        status: "APPROVED",
        remainingBalance: { gt: 0 },
      },
    });

    const loansByEmployee = loans.reduce((acc, curr) => {
      if (!acc[curr.employeeId]) acc[curr.employeeId] = [];
      acc[curr.employeeId].push(curr);
      return acc;
    }, {} as Record<string, typeof loans>);

    // Fetch all EmployeeSalary rows for structured allowances
    const employeeSalaries = await prisma.employeeSalary.findMany({
      where: { employeeId: { in: employees.map((e) => e.id) } },
    });
    const salaryByEmployee = new Map(
      employeeSalaries.map((s) => [s.employeeId, s])
    );

    // Calculate payroll items
    const payrollItemsData: Array<{
      employeeId: string;
      basic: number;
      houseRent: number;
      medical: number;
      transport: number;
      foodAllowance: number;
      otAmount: number;
      bonus: number;
      grossPay: number;
      absentDeduction: number;
      loanDeduction: number;
      taxDeduction: number;
      pfDeduction: number;
      totalDeduction: number;
      netPay: number;
      status: string;
    }> = [];
    let grandTotalAmount = 0;

    for (const emp of employees) {
      const basic = Number(emp.salary) || 0;
      if (basic <= 0) continue; // Skip if no salary setup

      // Load per-employee salary structure; fall back to global default %
      const empSalary = salaryByEmployee.get(emp.id);
      const houseRent = empSalary
        ? Number(empSalary.houseRent)
        : basic * (calc.defaultHouseRentPct / 100);
      const medical = empSalary
        ? Number(empSalary.medical)
        : basic * (calc.defaultMedicalPct / 100);
      const transport = empSalary
        ? Number(empSalary.transport)
        : basic * (calc.defaultTransportPct / 100);
      const foodAllowance = empSalary
        ? Number(empSalary.foodAllowance)
        : basic * (calc.defaultFoodAllowancePct / 100);
      const taxPercentage = empSalary ? Number(empSalary.taxPercentage) : 0;
      const pfPercentage = empSalary ? Number(empSalary.pfPercentage) : 0;

      // Attendance values
      const att = attendanceByEmployee[emp.id] || { absentDays: 0, otHours: 0 };

      // OT Amount — only hours exceeding dailyOtThresholdHours count as OT
      const hourlyRate = basic / (payDivisor * calc.workingHoursPerDay);
      const effectiveOtHours = Math.max(0, att.otHours - calc.dailyOtThresholdHours);
      const otAmount = effectiveOtHours * hourlyRate * calc.otMultiplier;

      // Festival Bonus — only when explicitly requested via options
      const bonus = options?.includeFestivalBonus
        ? basic * (calc.defaultFestivalBonusPct / 100)
        : 0;

      // Absent Deduction
      const dailyRate = basic / payDivisor;
      const absentDeduction = att.absentDays * dailyRate;

      // Loan Deduction
      let loanDeduction = 0;
      const empLoans = loansByEmployee[emp.id] || [];
      for (const loan of empLoans) {
        const deduction = Math.min(Number(loan.monthlyInstallment), Number(loan.remainingBalance));
        loanDeduction += deduction;
      }

      // Tax & PF based on per-employee config (or zero if not configured)
      const taxDeduction = basic * (taxPercentage / 100);
      const pfDeduction  = basic * (pfPercentage / 100);

      const grossPay       = basic + houseRent + medical + transport + foodAllowance + otAmount + bonus;
      const totalDeduction = absentDeduction + loanDeduction + taxDeduction + pfDeduction;
      // Apply net pay rounding from settings ("none" | "nearest10" | "nearest100")
      const rawNetPay = grossPay - totalDeduction;
      const netPay = applyNetPayRounding(rawNetPay, calc.netPayRounding);

      grandTotalAmount += netPay;

      payrollItemsData.push({
        employeeId: emp.id,
        basic,
        houseRent,
        medical,
        transport,
        foodAllowance,
        otAmount,
        bonus,
        grossPay,
        absentDeduction,
        loanDeduction,
        taxDeduction,
        pfDeduction,
        totalDeduction,
        netPay,
        status: "unpaid",
      });
    }

    if (payrollItemsData.length === 0) {
      return { success: false, error: "No employees have salary configured." };
    }

    // Safeguard: Verify attendance coverage
    const actualAttendanceCount = attendanceRecords.length;
    const expectedAttendanceCount = employees.length * calendarDaysInMonth;
    const coveragePercentage = (actualAttendanceCount / expectedAttendanceCount) * 100;
    
    if (coveragePercentage < 50) {
      return { 
        success: false, 
        error: `Attendance coverage is too low (${coveragePercentage.toFixed(1)}%). Please ensure attendance is processed for the entire month before generating payroll.` 
      };
    }

    // Generate Payroll Number (e.g. PR-2026-05)
    const payrollNumber = `PR-${year}-${month.toString().padStart(2, "0")}`;

    // Create Payroll Transaction
    const payroll = await prisma.$transaction(async (tx) => {
      return await tx.payroll.create({
        data: {
          payrollNumber,
          month,
          year,
          status: "DRAFT",
          totalAmount: grandTotalAmount,
          createdBy: session.user.id,
          items: {
            create: payrollItemsData,
          },
        },
      });
    });

    await logItemCreated(session.user.id, "Payroll", payroll.id, payrollNumber);
    revalidateBothPaths("hr/payroll");

    return { success: true, payrollId: payroll.id };
  } catch (error) {
    console.error("generatePayroll error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate payroll" };
  }
}

/**
 * Get paginated list of payrolls
 */
export async function getPayrolls(page = 1, limit = 10, year?: number, status?: PayrollStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized", payrolls: [], pagination: null };

    const skip = (page - 1) * limit;
    const where: Prisma.PayrollWhereInput = { isTrash: false };

    if (year) where.year = year;
    if (status) where.status = status;

    const total = await prisma.payroll.count({ where });
    const payrolls = await prisma.payroll.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        creator: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    // Serialize Decimals for Client Components
    const serializedPayrolls = payrolls.map(p => ({
      ...p,
      totalAmount: Number(p.totalAmount),
    }));

    return {
      success: true,
      payrolls: serializedPayrolls,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: "Failed to fetch payrolls", payrolls: [], pagination: null };
  }
}

/**
 * Get Payroll Details
 */
export async function getPayrollById(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        approver: { select: { name: true } },
        items: {
          include: {
            employee: { select: { id: true, name: true, employeeCode: true, designation: true } },
          },
          orderBy: { employee: { name: "asc" } },
        },
      },
    });

    if (!payroll) return { success: false, error: "Payroll not found" };

    // Serialize Decimals for Client Components
    const serializedPayroll = {
      ...payroll,
      totalAmount: Number(payroll.totalAmount),
      items: payroll.items.map(item => ({
        ...item,
        basic: Number(item.basic),
        houseRent: Number(item.houseRent),
        medical: Number(item.medical),
        transport: Number(item.transport),
        foodAllowance: Number(item.foodAllowance),
        otAmount: Number(item.otAmount),
        bonus: Number(item.bonus),
        grossPay: Number(item.grossPay),
        absentDeduction: Number(item.absentDeduction),
        loanDeduction: Number(item.loanDeduction),
        taxDeduction: Number(item.taxDeduction),
        pfDeduction: Number(item.pfDeduction),
        totalDeduction: Number(item.totalDeduction),
        netPay: Number(item.netPay),
      }))
    };

    return { success: true, payroll: serializedPayroll };
  } catch (error) {
    return { success: false, error: "Failed to fetch payroll details" };
  }
}

/**
 * Update Payroll Status (Approval workflow)
 */
export async function updatePayrollStatus(id: string, status: PayrollStatus) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "hr.payroll", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    const oldPayroll = await prisma.payroll.findUnique({ where: { id } });
    if (!oldPayroll) return { success: false, error: "Not found" };

    if (oldPayroll.status === "POSTED") {
      return { success: false, error: "Posted payrolls cannot be changed" };
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status,
        ...(status === "APPROVED" ? { approvedBy: session.user.id } : {}),
      },
    });

    await logItemUpdated(session.user.id, "Payroll", id, [`status:${status}`], "Payroll Status Update");
    revalidateBothPaths(`hr/payroll/${id}`);
    revalidateBothPaths("hr/payroll");

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Post Payroll to Accounting
 * 1. Creates a Journal Voucher
 * 2. Posts the Voucher
 * 3. Updates Payroll and locks it
 * 4. Deducts Loan balances
 */
export async function postPayroll(payrollId: string, salaryExpenseAccountId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canPost = await hasPermission(session.user.id, "hr.payroll", "edit");
    // Fallback if hr.payroll post permission doesn't exist, use accounts.vouchers create
    const canCreateVoucher = await hasPermission(session.user.id, "accounts.vouchers", "create");
    if (!canPost && !canCreateVoucher) return { success: false, error: "Permission denied" };

    // Validate HR Accounting Setup Guard
    const hrGuard = await validateHRMAccountingSetup("PAYROLL_POST", { payrollId, salaryExpenseAccountId });
    if (!hrGuard.ok) {
      return { success: false, error: hrGuard.errors.join(". ") };
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!payroll) return { success: false, error: "Payroll not found" };
    if (payroll.status === "POSTED") return { success: false, error: "Already posted" };
    if (payroll.status !== "APPROVED") return { success: false, error: "Payroll must be approved before posting" };

    // Load settings for calculation rules and default accounts
    const payrollSettings = await getPayrollSettings();
    const accountingSettings = await getAccountingOperationSettings();
    const accounts = accountingSettings.payroll;

    // Prepare Voucher Lines
    const voucherLines: any[] = [];
    let lineNumber = 1;
    let totalGrossPay = 0;

    // We will debit the total gross pay to the Salary Expense account
    // We will credit the net pay to each employee's Salary Payable account
    // We will credit the loan deduction to each employee's Advance account
    // (Ignoring Tax/PF for MVP or we'd need more specific global accounts selected by user)

    for (const item of payroll.items) {
      totalGrossPay += Number(item.grossPay);

      // Credit: Employee Salary Payable (Net Pay)
      if (item.employee.salaryPayableAccountId && Number(item.netPay) > 0) {
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: item.employee.salaryPayableAccountId,
          creditAmount: Number(item.netPay),
          debitAmount: 0,
          description: `Salary Payable for ${item.employee.name} (${payroll.payrollNumber})`,
        });
      } else if (Number(item.netPay) > 0) {
         return { success: false, error: `Employee ${item.employee.name} is missing a Salary Payable Account configuration.` };
      }

      // Credit: Employee Advance Account (Loan Deduction)
      if (Number(item.loanDeduction) > 0) {
        const advanceAcctId =
          item.employee.advanceAccountId ||
          accounts.defaultAdvanceAccountId;
        if (advanceAcctId) {
          voucherLines.push({
            lineNumber: lineNumber++,
            chartOfAccountId: advanceAcctId,
            creditAmount: Number(item.loanDeduction),
            debitAmount: 0,
            description: `Loan Deduction for ${item.employee.name} (${payroll.payrollNumber})`,
          });
        } else {
          return { success: false, error: `Employee ${item.employee.name} has loan deductions but no Advance Account configured. Please set a Default Advance Account in Accounting Settings.` };
        }
      }

      // Credit: Tax Payable (if tax was deducted)
      if (Number(item.taxDeduction) > 0) {
        const taxAcctId = accounts.taxPayableAccountId;
        if (taxAcctId) {
          voucherLines.push({
            lineNumber: lineNumber++,
            chartOfAccountId: taxAcctId,
            creditAmount: Number(item.taxDeduction),
            debitAmount: 0,
            description: `Tax Withholding for ${item.employee.name} (${payroll.payrollNumber})`,
          });
        }
        // If no tax account configured, we include it in expense debit to keep books balanced
      }

      // Credit: PF Payable (if PF was deducted)
      if (Number(item.pfDeduction) > 0) {
        const pfAcctId = accounts.pfPayableAccountId;
        if (pfAcctId) {
          voucherLines.push({
            lineNumber: lineNumber++,
            chartOfAccountId: pfAcctId,
            creditAmount: Number(item.pfDeduction),
            debitAmount: 0,
            description: `PF Deduction for ${item.employee.name} (${payroll.payrollNumber})`,
          });
        }
        // If no PF account configured, include in expense debit to keep books balanced
      }

      // Credit: Festival Bonus (if any) — credited to the default salary payable as bonus liability
      if (Number(item.bonus) > 0) {
        const bonusAcctId =
          accounts.festivalBonusExpenseAccountId ||
          accounts.defaultSalaryPayableAccountId;
        if (bonusAcctId) {
          voucherLines.push({
            lineNumber: lineNumber++,
            chartOfAccountId: bonusAcctId,
            creditAmount: Number(item.bonus),
            debitAmount: 0,
            description: `Festival Bonus for ${item.employee.name} (${payroll.payrollNumber})`,
          });
        }
      }
    } // end per-employee loop

    // After the per-item loop — add Employer PF matching lines (1 pair for whole payroll)
    const totalEmployerPf = payroll.items.reduce((sum, item) => {
      const basic = Number(item.basic);
      return sum + basic * (payrollSettings.calculation.employerPfPct / 100);
    }, 0);

    if (
      totalEmployerPf > 0 &&
      accounts.employerPfExpenseAccountId &&
      accounts.employerPfPayableAccountId
    ) {
      // DR: Employer PF Expense
      voucherLines.push({
        lineNumber: lineNumber++,
        chartOfAccountId: accounts.employerPfExpenseAccountId,
        debitAmount: totalEmployerPf,
        creditAmount: 0,
        description: `Employer PF Contribution for ${payroll.payrollNumber}`,
      });
      // CR: Employer PF Payable
      voucherLines.push({
        lineNumber: lineNumber++,
        chartOfAccountId: accounts.employerPfPayableAccountId,
        debitAmount: 0,
        creditAmount: totalEmployerPf,
        description: `Employer PF Payable for ${payroll.payrollNumber}`,
      });
    }

    // Debit: Salary Expense Account
    // DR Salary Expense = sum of all credit lines (Net Pay + Loan + Tax + PF)
    // This ensures the voucher always balances regardless of which optional accounts are configured.
    let totalDebitExpense = 0;
    for (const line of voucherLines) {
      totalDebitExpense += Number(line.creditAmount);
    }

    // Use the passed-in salaryExpenseAccountId, fall back to payroll settings default
    const effectiveSalaryExpenseId =
      salaryExpenseAccountId || accounts.salaryExpenseAccountId;
    if (!effectiveSalaryExpenseId) {
      return {
        success: false,
        error:
          "No Salary Expense account configured. Please configure one in Accounting Settings or select one when posting.",
      };
    }

    voucherLines.unshift({
      lineNumber: lineNumber++,
      chartOfAccountId: effectiveSalaryExpenseId,
      debitAmount: totalDebitExpense,
      creditAmount: 0,
      description: `Total Salary Expense for ${payroll.payrollNumber}`,
    });


    const createVchInput = {
      date: new Date(),
      type: "JOURNAL" as const,
      reference: payroll.payrollNumber,
      description: `Payroll Accrual for ${payroll.month}/${payroll.year}`,
      isSystemAction: true, // Bypass manual block rules
      lines: voucherLines,
    };

    // 1. Create Voucher
    const vchResult = await createVoucher(createVchInput);
    if (!vchResult.success || !vchResult.voucher) {
      return { success: false, error: `Failed to create voucher: ${vchResult.error}` };
    }

    // 2. Post Voucher
    const postResult = await postVoucher(vchResult.voucher.id, undefined, true);
    if (!postResult.success) {
      return { success: false, error: `Failed to post voucher: ${postResult.error}` };
    }

    // 3. Lock Payroll, update Loans, and lock Attendance
    await prisma.$transaction(async (tx) => {
      // Update Payroll
      await tx.payroll.update({
        where: { id: payrollId },
        data: {
          status: "POSTED",
          voucherId: vchResult.voucher.id,
        },
      });

      // Update Loan Balances
      for (const item of payroll.items) {
        if (Number(item.loanDeduction) > 0) {
          // Find active loans for this employee, ordered by oldest
          const loans = await tx.employeeLoan.findMany({
            where: { employeeId: item.employeeId, status: "APPROVED", remainingBalance: { gt: 0 } },
            orderBy: { issueDate: 'asc' },
          });

          let amountToDeduct = Number(item.loanDeduction);
          for (const loan of loans) {
            if (amountToDeduct <= 0) break;
            
            const deduction = Math.min(amountToDeduct, Number(loan.remainingBalance));
            const newBalance = Number(loan.remainingBalance) - deduction;
            
            await tx.employeeLoan.update({
              where: { id: loan.id },
              data: {
                remainingBalance: newBalance,
                ...(newBalance <= 0 ? { status: "CLOSED" as const } : {})
              }
            });
            
            amountToDeduct -= deduction;
          }
        }
      }

      // 4. Lock ALL Attendance records for this month to prevent edits
      const monthStart = new Date(payroll.year, payroll.month - 1, 1);
      const monthEnd = new Date(payroll.year, payroll.month, 0, 23, 59, 59, 999);
      
      await tx.attendance.updateMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
        },
        data: {
          isLocked: true,
        },
      });
    });

    revalidateBothPaths(`hr/payroll/${payrollId}`);
    revalidateBothPaths("hr/payroll");

    return { success: true, message: "Payroll posted successfully" };
  } catch (error) {
    console.error("postPayroll error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to post payroll" };
  }
}

/**
 * Disburse Payroll (Salary Payment)
 * 1. Creates a PAYMENT Voucher
 * 2. Credits Cash/Bank
 * 3. Debits Employee Salary Payable Accounts
 * 4. Marks Payroll and Items as Paid
 */
export async function disbursePayroll(payrollId: string, cashBankAccountId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canPost = await hasPermission(session.user.id, "hr.payroll", "edit");
    const canCreateVoucher = await hasPermission(session.user.id, "accounts.vouchers", "create");
    if (!canPost && !canCreateVoucher) return { success: false, error: "Permission denied" };

    // Validate HR Accounting Setup Guard
    const hrGuard = await validateHRMAccountingSetup("PAYROLL_DISBURSE", { cashBankAccountId });
    if (!hrGuard.ok) {
      return { success: false, error: hrGuard.errors.join(". ") };
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!payroll) return { success: false, error: "Payroll not found" };
    if (payroll.status !== "POSTED") return { success: false, error: "Payroll must be posted (accrued) before disbursement" };
    if (payroll.paymentVchId) return { success: false, error: "Payroll has already been disbursed" };

    // Prepare Voucher Lines for PAYMENT
    const voucherLines: any[] = [];
    let lineNumber = 1;
    let totalNetPay = 0;

    for (const item of payroll.items) {
      if (Number(item.netPay) > 0) {
        if (!item.employee.salaryPayableAccountId) {
          return { success: false, error: `Employee ${item.employee.name} is missing a Salary Payable Account.` };
        }

        totalNetPay += Number(item.netPay);

        // Debit: Employee Salary Payable
        voucherLines.push({
          lineNumber: lineNumber++,
          chartOfAccountId: item.employee.salaryPayableAccountId,
          debitAmount: Number(item.netPay),
          creditAmount: 0,
          description: `Salary Payment for ${item.employee.name} (${payroll.payrollNumber})`,
        });
      }
    }

    if (totalNetPay <= 0) {
      return { success: false, error: "Total net pay is 0. Nothing to disburse." };
    }

    // Credit: Cash/Bank Account
    voucherLines.push({
      lineNumber: lineNumber++,
      chartOfAccountId: cashBankAccountId,
      debitAmount: 0,
      creditAmount: totalNetPay,
      description: `Total Salary Disbursement for ${payroll.payrollNumber}`,
    });

    const createVchInput = {
      date: new Date(),
      type: "PAYMENT" as const,
      reference: payroll.payrollNumber,
      description: `Salary Disbursement for ${payroll.month}/${payroll.year}`,
      isSystemAction: true, // Bypass manual block rules
      lines: voucherLines,
    };

    // 1. Create Voucher
    const vchResult = await createVoucher(createVchInput);
    if (!vchResult.success || !vchResult.voucher) {
      return { success: false, error: `Failed to create payment voucher: ${vchResult.error}` };
    }

    // 2. Post Voucher
    const postResult = await postVoucher(vchResult.voucher.id, undefined, true);
    if (!postResult.success) {
      return { success: false, error: `Failed to post payment voucher: ${postResult.error}` };
    }

    // 3. Mark Payroll and Items as PAID
    await prisma.$transaction(async (tx) => {
      // Update Payroll status to PAID
      await tx.payroll.update({
        where: { id: payrollId },
        data: {
          paymentVchId: vchResult.voucher.id,
          status: "PAID",
        },
      });

      // Update Items
      await tx.payrollItem.updateMany({
        where: { payrollId },
        data: {
          status: "paid",
        },
      });
    });

    revalidateBothPaths(`hr/payroll/${payrollId}`);
    revalidateBothPaths("hr/payroll");

    return { success: true, message: "Payroll disbursed successfully" };
  } catch (error) {
    console.error("disbursePayroll error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to disburse payroll" };
  }
}

/**
 * Void Payroll (Reverse all accounting and loan impacts)
 */
export async function voidPayroll(payrollId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canVoid = await hasPermission(session.user.id, "hr.payroll", "delete");
    if (!canVoid) return { success: false, error: "Permission denied" };

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: { items: true },
    });

    if (!payroll) return { success: false, error: "Payroll not found" };
    if (payroll.status === "PAID") return { success: false, error: "Cannot void a disbursed payroll. Reverse the payment first." };

    await prisma.$transaction(async (tx) => {
      // 1. Cancel Accrual Voucher if it exists
      if (payroll.voucherId) {
        const vchResult = await cancelVoucher(payroll.voucherId, tx, true);
        if (!vchResult.success) throw new Error(`Failed to cancel voucher: ${vchResult.error}`);
      }

      // 2. Revert Loan Balances if it was POSTED
      if (payroll.status === "POSTED") {
        for (const item of payroll.items) {
          if (Number(item.loanDeduction) > 0) {
            // Re-find the loans to restore balance
            // This is complex as multiple loans might have been touched.
            // Simplified: Add back the deduction to the first active/completed loan for that employee.
            const loan = await tx.employeeLoan.findFirst({
              where: { employeeId: item.employeeId, status: { in: ["APPROVED", "CLOSED"] } },
              orderBy: { updatedAt: 'desc' },
            });

            if (loan) {
              await tx.employeeLoan.update({
                where: { id: loan.id },
                data: {
                  remainingBalance: Number(loan.remainingBalance) + Number(item.loanDeduction),
                  status: "APPROVED" as const
                }
              });
            }
          }
        }
      }

      // 3. Unlock Attendance records for the period
      const monthStart = new Date(payroll.year, payroll.month - 1, 1);
      const monthEnd = new Date(payroll.year, payroll.month, 0, 23, 59, 59, 999);
      
      await tx.attendance.updateMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
        },
        data: {
          isLocked: false,
        },
      });

      // 4. Update Payroll Status
      await tx.payroll.update({
        where: { id: payrollId },
        data: {
          status: "DRAFT",
          voucherId: null,
        },
      });
    });

    revalidateBothPaths(`hr/payroll/${payrollId}`);
    revalidateBothPaths("hr/payroll");

    return { success: true, message: "Payroll voided and reverted to draft." };
  } catch (error) {
    console.error("voidPayroll error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to void payroll" };
  }
}

