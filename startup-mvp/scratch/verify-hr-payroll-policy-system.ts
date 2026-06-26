import { prisma } from "../lib/prisma";

async function runVerification() {
  console.log("==================================================");
  console.log("RUNNING HR & PAYROLL SYSTEM PRODUCTION READINESS CHECKS");
  console.log("==================================================\n");

  let totalWarnings = 0;
  let totalErrors = 0;

  // Helper to log status
  function logCheck(name: string, passed: boolean, message: string) {
    if (passed) {
      console.log(`[PASS] ${name}: ${message}`);
    } else {
      console.log(`[FAIL] ${name}: ${message}`);
      totalErrors++;
    }
  }

  function logWarning(name: string, message: string) {
    console.log(`[WARN] ${name}: ${message}`);
    totalWarnings++;
  }

  try {
    // 1. Default SalaryStructurePolicy Check
    const defaultSalaryPolicies = await prisma.salaryStructurePolicy.findMany({
      where: { isDefault: true, isTrash: false, status: "active" }
    });
    logCheck(
      "Default Salary Structure Policy",
      defaultSalaryPolicies.length > 0,
      defaultSalaryPolicies.length > 0 
        ? `Found ${defaultSalaryPolicies.length} active default policy.` 
        : "No active default SalaryStructurePolicy found. Fallback split of 55/26/5/4/10 will be used."
    );

    // 2. Default PayrollSetting Check
    const defaultPayrollSettings = await prisma.payrollSetting.findMany({
      where: { isDefault: true, status: "active" }
    });
    logCheck(
      "Default Payroll Settings",
      defaultPayrollSettings.length > 0,
      defaultPayrollSettings.length > 0
        ? `Found active default PayrollSetting: ${defaultPayrollSettings[0].name}`
        : "No active default PayrollSetting found. System will fall back to default divisor 30."
    );

    // 3. Policy Percentages Sum check
    const activeSalaryPolicies = await prisma.salaryStructurePolicy.findMany({
      where: { isTrash: false, status: "active" }
    });
    let percentageSumValid = true;
    for (const policy of activeSalaryPolicies) {
      const basic = Number(policy.basicPercent);
      const houseRent = Number(policy.houseRentPercent);
      const medical = Number(policy.medicalPercent);
      const transport = Number(policy.transportPercent);
      const food = Number(policy.foodPercent);
      const sum = basic + houseRent + medical + transport + food;
      if (Math.abs(sum - 100) > 0.01) {
        logCheck(
          `Salary Policy Percentages (${policy.name})`,
          false,
          `Percentages sum to ${sum}%, not exactly 100%!`
        );
        percentageSumValid = false;
      }
    }
    if (percentageSumValid && activeSalaryPolicies.length > 0) {
      logCheck(
        "Salary Policy Percentages Check",
        true,
        `All ${activeSalaryPolicies.length} active salary structure policy percentages sum to exactly 100%.`
      );
    }

    // 4. EmployeeType Policy Mapping references check
    const employeeTypes = await prisma.employeeType.findMany({
      include: {
        salaryStructurePolicy: true,
        attendancePolicy: true,
        latePolicy: true,
        overtimePolicy: true,
        tiffinBillPolicy: true,
        nightBillPolicy: true,
        holidayBillPolicy: true
      }
    });

    let brokenReferences = 0;
    for (const type of employeeTypes) {
      if (type.salaryStructurePolicyId && !type.salaryStructurePolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted SalaryStructurePolicy ID: ${type.salaryStructurePolicyId}`);
        brokenReferences++;
      }
      if (type.attendancePolicyId && !type.attendancePolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted AttendancePolicy ID: ${type.attendancePolicyId}`);
        brokenReferences++;
      }
      if (type.latePolicyId && !type.latePolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted LatePolicy ID: ${type.latePolicyId}`);
        brokenReferences++;
      }
      if (type.overtimePolicyId && !type.overtimePolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted OvertimePolicy ID: ${type.overtimePolicyId}`);
        brokenReferences++;
      }
      if (type.tiffinBillPolicyId && !type.tiffinBillPolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted TiffinBillPolicy ID: ${type.tiffinBillPolicyId}`);
        brokenReferences++;
      }
      if (type.nightBillPolicyId && !type.nightBillPolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted NightBillPolicy ID: ${type.nightBillPolicyId}`);
        brokenReferences++;
      }
      if (type.holidayBillPolicyId && !type.holidayBillPolicy) {
        logWarning("EmployeeType Mapping", `Employee Type "${type.name}" references a missing/deleted HolidayBillPolicy ID: ${type.holidayBillPolicyId}`);
        brokenReferences++;
      }
    }
    logCheck(
      "EmployeeType Policy Mapping References",
      brokenReferences === 0,
      brokenReferences === 0
        ? `All mappings are valid for the ${employeeTypes.length} configured Employee Types.`
        : `Found ${brokenReferences} mapped policies that reference non-existent records.`
    );

    // 5. Active Policy negative amount check
    const [tiffinNegative, nightNegative, holidayNegative, overtimeNegative] = await Promise.all([
      prisma.tiffinBillPolicy.findFirst({ where: { status: "active", isTrash: false, amount: { lt: 0 } } }),
      prisma.nightBillPolicy.findFirst({ where: { status: "active", isTrash: false, amount: { lt: 0 } } }),
      prisma.holidayBillPolicy.findFirst({ where: { status: "active", isTrash: false, fixedAmount: { lt: 0 } } }),
      prisma.overtimePolicy.findFirst({ where: { status: "active", isTrash: false, OR: [{ fixedOTRate: { lt: 0 } }, { multiplier: { lt: 0 } }] } }),
    ]);

    const hasNegativePolicyAmount = !!(tiffinNegative || nightNegative || holidayNegative || overtimeNegative);
    logCheck(
      "Negative Policy Amounts Check",
      !hasNegativePolicyAmount,
      !hasNegativePolicyAmount
        ? "No active tiffin, night, holiday, or overtime policy contains negative amounts."
        : "Found active policies with invalid negative amounts."
    );

    // 6. Generated payroll Net Pay consistency check
    const payrollItems = await prisma.payrollItem.findMany();
    let netPayMismatches = 0;
    for (const item of payrollItems) {
      const gross = Number(item.grossPay);
      const deduction = Number(item.totalDeduction);
      const net = Number(item.netPay);
      // Allowing small floating-point margin of 0.05 BDT
      if (Math.abs(gross - deduction - net) > 0.05) {
        logWarning(
          "Net Pay Consistency Check",
          `Payroll item ID: ${item.id} has mismatch: Gross(${gross}) - Ded(${deduction}) = ${gross - deduction}, but NetPay is ${net}`
        );
        netPayMismatches++;
      }
    }
    logCheck(
      "Payroll Net Pay Consistency Check",
      netPayMismatches === 0,
      netPayMismatches === 0
        ? `All ${payrollItems.length} generated payroll items pass net pay mathematical validation (grossPay - totalDeduction = netPay).`
        : `Found ${netPayMismatches} payroll items with net pay calculation mismatches.`
    );

    // 7. Posted payroll Accounting Balance check
    const vouchers = await prisma.voucher.findMany({
      where: {
        reference: { startsWith: "PR-" }
      },
      include: {
        VoucherLine: true
      }
    });

    let unbalancedVouchers = 0;
    for (const vch of vouchers) {
      const debitSum = vch.VoucherLine.reduce((sum, l) => sum + Number(l.debitAmount), 0);
      const creditSum = vch.VoucherLine.reduce((sum, l) => sum + Number(l.creditAmount), 0);
      if (Math.abs(debitSum - creditSum) > 0.01) {
        logWarning(
          "Accounting Balance Check",
          `Voucher ${vch.voucherNumber} (Reference: ${vch.reference}) is unbalanced! Debits: ${debitSum}, Credits: ${creditSum}`
        );
        unbalancedVouchers++;
      }
    }

    logCheck(
      "Posted Payroll Voucher Balance Check",
      unbalancedVouchers === 0,
      unbalancedVouchers === 0
        ? `All ${vouchers.length} posted payroll accounting vouchers balance perfectly (Total Debits = Total Credits).`
        : `Found ${unbalancedVouchers} unbalanced payroll accounting vouchers.`
    );

  } catch (error) {
    console.error("Verification failed unexpectedly:", error);
    totalErrors++;
  }

  console.log("\n==================================================");
  console.log("PRODUCTION READINESS CHECKS SUMMARY");
  console.log(`Errors:   ${totalErrors}`);
  console.log(`Warnings: ${totalWarnings}`);
  console.log(`Verdict:  ${totalErrors === 0 ? "PASSED - SYSTEM READY" : "FAILED - NEEDS CORRECTIONS"}`);
  console.log("==================================================");
}

runVerification();
