import { prisma } from "../lib/prisma";
import { getPayrollSettings } from "../lib/payroll-settings";
import { getAccountingOperationSettings } from "../lib/accounting-settings";
import { formatBusinessDateKey, syncTimezoneFromDb } from "../lib/hr/shift-utils";
import { Decimal } from "@prisma/client/runtime/library";

async function simulateGeneration() {
  const month = 7;
  const year = 2026;

  console.log("1. Syncing timezone...");
  await syncTimezoneFromDb();

  console.log("2. Loading employees...");
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    include: {
      employeeType: {
        include: {
          attendancePolicy: true,
          latePolicy: true,
          overtimePolicy: true,
          tiffinBillPolicy: true,
          nightBillPolicy: true,
          holidayBillPolicy: true,
          salaryStructurePolicy: true,
        }
      }
    }
  });
  console.log(`Found ${employees.length} active employees.`);

  if (employees.length === 0) return;

  const defaultSalaryStructurePolicy = await prisma.salaryStructurePolicy.findFirst({
    where: { isDefault: true, isTrash: false, status: "active" }
  });

  const activePayrollSetting = await prisma.payrollSetting.findFirst({
    where: { status: "active", isDefault: true }
  });

  const payrollSettings = await getPayrollSettings();
  const calc = payrollSettings.calculation;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const calendarDaysInMonth = endDate.getDate();
  const payDivisor = calc.absentDeductionMode === "working" ? calc.standardWorkingDays : calendarDaysInMonth;

  let resolvedLateDeductionDivisor = 30;
  if (activePayrollSetting?.defaultPayDivisor) {
    resolvedLateDeductionDivisor = activePayrollSetting.defaultPayDivisor;
  } else if (activePayrollSetting?.defaultMonthlyWorkingDays) {
    resolvedLateDeductionDivisor = activePayrollSetting.defaultMonthlyWorkingDays;
  } else if (payDivisor) {
    resolvedLateDeductionDivisor = payDivisor;
  }

  console.log("3. Fetching attendance records...");
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
  console.log(`Found ${attendanceRecords.length} attendance records.`);

  const attendanceByEmployee = attendanceRecords.reduce((acc, curr) => {
    const empId = curr.employeeId;
    if (!acc[empId]) {
      acc[empId] = {
        absentDays: 0,
        otHours: 0,
        lateCountTotal: 0,
        totalCalculatedOvertimeAmount: 0,
        totalTiffinAllowance: 0,
        totalNightAllowance: 0,
        totalHolidayAllowance: 0,
      };
    }
    
    if (curr.status === "ABSENT") {
      acc[empId].absentDays += 1;
    } else if (curr.status === "HALF_DAY") {
      acc[empId].absentDays += 0.5;
    } else if (curr.status === "LEAVE") {
      const isPaid = curr.leaveApplication?.leaveType?.isPaid ?? true;
      if (!isPaid) {
        acc[empId].absentDays += 1;
      }
    }
    
    acc[empId].otHours += Number(curr.otHours) || 0;
    acc[empId].lateCountTotal += (Number(curr.lateCountValue) || 0) + (Number(curr.breakLateCountValue) || 0);
    acc[empId].totalCalculatedOvertimeAmount += Number(curr.calculatedOvertimeAmount) || 0;
    acc[empId].totalTiffinAllowance += Number(curr.tiffinBillAmount) || 0;
    acc[empId].totalNightAllowance += Number(curr.nightBillAmount) || 0;
    acc[empId].totalHolidayAllowance += Number(curr.holidayBillAmount) || 0;
    return acc;
  }, {} as Record<string, any>);

  console.log("4. Loading loans, fines, and bonuses...");
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

  const approvedFines = await prisma.employeeFine.findMany({
    where: {
      status: "APPROVED",
      fineDate: { gte: startDate, lte: endDate },
    },
  });

  const finesByEmployee = approvedFines.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) acc[curr.employeeId] = 0;
    acc[curr.employeeId] += Number(curr.amount);
    return acc;
  }, {} as Record<string, number>);

  const approvedBonuses = await prisma.employeeBonus.findMany({
    where: {
      status: "APPROVED",
      bonusDate: { gte: startDate, lte: endDate },
    },
  });

  const bonusesByEmployee = approvedBonuses.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) acc[curr.employeeId] = 0;
    acc[curr.employeeId] += Number(curr.amount);
    return acc;
  }, {} as Record<string, number>);

  const employeeSalaries = await prisma.employeeSalary.findMany({
    where: { employeeId: { in: employees.map((e) => e.id) } },
  });
  const salaryByEmployee = new Map(
    employeeSalaries.map((s) => [s.employeeId, s])
  );

  const { calculateLatePolicyPreview } = await import("../lib/hr-payroll/policy-calculation");

  console.log("5. Computing payroll items...");
  const payrollItemsData: any[] = [];
  let grandTotalAmount = 0;

  for (const emp of employees) {
    const rawSalary = Number(emp.salary) || 0;
    if (rawSalary <= 0) continue;

    let basic = 0;
    let houseRent = 0;
    let medical = 0;
    let transport = 0;
    let foodAllowance = 0;

    const empTypePolicies = emp.employeeType;
    const empSalary = salaryByEmployee.get(emp.id);

    if (empTypePolicies?.salaryStructurePolicy) {
      const policy = empTypePolicies.salaryStructurePolicy;
      basic = Number((rawSalary * (Number(policy.basicPercent) / 100)).toFixed(2));
      houseRent = Number((rawSalary * (Number(policy.houseRentPercent) / 100)).toFixed(2));
      medical = Number((rawSalary * (Number(policy.medicalPercent) / 100)).toFixed(2));
      transport = Number((rawSalary * (Number(policy.transportPercent) / 100)).toFixed(2));
      foodAllowance = Number((rawSalary * (Number(policy.foodPercent) / 100)).toFixed(2));
    } else if (defaultSalaryStructurePolicy) {
      const policy = defaultSalaryStructurePolicy;
      basic = Number((rawSalary * (Number(policy.basicPercent) / 100)).toFixed(2));
      houseRent = Number((rawSalary * (Number(policy.houseRentPercent) / 100)).toFixed(2));
      medical = Number((rawSalary * (Number(policy.medicalPercent) / 100)).toFixed(2));
      transport = Number((rawSalary * (Number(policy.transportPercent) / 100)).toFixed(2));
      foodAllowance = Number((rawSalary * (Number(policy.foodPercent) / 100)).toFixed(2));
    } else {
      basic = Number((rawSalary * 0.55).toFixed(2));
      houseRent = Number((rawSalary * 0.26).toFixed(2));
      medical = Number((rawSalary * 0.05).toFixed(2));
      transport = Number((rawSalary * 0.04).toFixed(2));
      foodAllowance = Number((rawSalary * 0.10).toFixed(2));
    }

    const taxPercentage = empSalary ? Number(empSalary.taxPercentage) : 0;
    const pfPercentage = empSalary ? Number(empSalary.pfPercentage) : 0;

    const att = attendanceByEmployee[emp.id] || {
      absentDays: 0,
      otHours: 0,
      lateCountTotal: 0,
      totalCalculatedOvertimeAmount: 0,
      totalTiffinAllowance: 0,
      totalNightAllowance: 0,
      totalHolidayAllowance: 0,
    };

    const tiffinAllowance = att.totalTiffinAllowance;
    const nightAllowance = att.totalNightAllowance;
    const holidayAllowance = att.totalHolidayAllowance;

    let otAmount = 0;
    if (empTypePolicies?.overtimePolicy?.isEligible) {
      otAmount = att.totalCalculatedOvertimeAmount;
    } else {
      const hourlyRateForOT = basic / (payDivisor * calc.workingHoursPerDay);
      const effectiveOtHours = Math.max(0, att.otHours - calc.dailyOtThresholdHours);
      otAmount = Number((effectiveOtHours * hourlyRateForOT * calc.otMultiplier).toFixed(2));
    }

    const dailyRateForAbsent = basic / payDivisor;
    let absentDeduction = 0;
    const applyAbsentPenalty = empTypePolicies?.attendancePolicy ? empTypePolicies.attendancePolicy.applyAbsentPenalty : true;
    if (applyAbsentPenalty) {
      absentDeduction = Number((att.absentDays * dailyRateForAbsent).toFixed(2));
    }

    let lateDeduction = 0;
    let attendanceBonusLost = false;
    const applyLatePenalty = empTypePolicies?.attendancePolicy ? empTypePolicies.attendancePolicy.applyLatePenalty : true;

    if (applyLatePenalty && empTypePolicies?.latePolicy?.isEnabled) {
      const latePolicy = empTypePolicies.latePolicy;
      const dailyRateForLate = Number((rawSalary / resolvedLateDeductionDivisor).toFixed(2));
      const lateRes = calculateLatePolicyPreview({
        latePolicy: {
          isEnabled: latePolicy.isEnabled,
          enableLateToAbsentConversion: latePolicy.enableLateToAbsentConversion,
          lateDaysForOneAbsent: latePolicy.lateDaysForOneAbsent,
          lateCountForBonusLoss: latePolicy.lateCountForBonusLoss,
          deductSalaryForLate: latePolicy.deductSalaryForLate,
          deductAttendanceBonusForLate: latePolicy.deductAttendanceBonusForLate,
        },
        lateCountInPeriod: att.lateCountTotal,
        dailyRate: dailyRateForLate,
        attendanceBonusAmount: Number(empTypePolicies.attendancePolicy?.attendanceBonusAmount) || 0,
      });

      lateDeduction = lateRes.lateDeductionAmount;
      attendanceBonusLost = lateRes.attendanceBonusLost;
    }

    let otherAllowance = 0;
    let otherDeduction = 0;
    if (empTypePolicies?.attendancePolicy?.isEnabled && empTypePolicies?.attendancePolicy?.isEligibleForAttendanceBonus) {
      const bonusPolicy = empTypePolicies.attendancePolicy;
      if (bonusPolicy.bonusCalculationType === "FIXED") {
        const bonusAmt = Number(bonusPolicy.attendanceBonusAmount) || 0;
        const hasAbsences = att.absentDays > 0;
        const isBonusLost = attendanceBonusLost || (hasAbsences && applyAbsentPenalty);
        if (!isBonusLost) otherAllowance = bonusAmt;
      }
    }

    let loanDeduction = 0;
    const empLoans = loansByEmployee[emp.id] || [];
    for (const loan of empLoans) {
      loanDeduction += Math.min(Number(loan.monthlyInstallment), Number(loan.remainingBalance));
    }

    const taxDeduction = basic * (taxPercentage / 100);
    const pfDeduction = basic * (pfPercentage / 100);

    const customFine = finesByEmployee[emp.id] || 0;
    const customBonus = bonusesByEmployee[emp.id] || 0;

    const grossPay = Number((
      basic + houseRent + medical + transport + foodAllowance +
      otAmount + tiffinAllowance + nightAllowance + holidayAllowance + otherAllowance + customBonus
    ).toFixed(2));

    const totalDeduction = Number((
      absentDeduction + lateDeduction + loanDeduction + taxDeduction + pfDeduction + otherDeduction + customFine
    ).toFixed(2));

    const netPay = Number((grossPay - totalDeduction).toFixed(2));
    grandTotalAmount += netPay;

    payrollItemsData.push({
      employeeId: emp.id,
      basic,
      houseRent,
      medical,
      transport,
      foodAllowance,
      otAmount,
      bonus: 0,
      grossPay,
      absentDeduction,
      loanDeduction,
      taxDeduction,
      pfDeduction,
      totalDeduction,
      netPay,
      tiffinAllowance,
      nightAllowance,
      holidayAllowance,
      otherAllowance,
      lateDeduction,
      otherDeduction,
      customFine,
      customBonus,
      status: "unpaid"
    });
  }

  console.log(`Payroll Items Computed: ${payrollItemsData.length}. Total Amount: ${grandTotalAmount}`);
  console.log("Simulated successfully with zero errors!");
}

simulateGeneration();
