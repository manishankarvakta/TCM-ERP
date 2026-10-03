import { prisma } from "../lib/prisma";

async function main() {
  const itemId = "cmunx07pc001bmd01txd58x3i";
  const item = await prisma.payrollItem.findUnique({
    where: { id: itemId },
    include: {
      payroll: true,
      employee: {
        include: {
          employeeType: {
            include: {
              salaryStructurePolicy: true,
              attendancePolicy: true,
              latePolicy: true,
              overtimePolicy: true,
              tiffinBillPolicy: true,
              nightBillPolicy: true,
              holidayBillPolicy: true,
            }
          }
        }
      }
    }
  });

  if (!item) {
    console.log("NOT FOUND");
    return;
  }

  console.log("PAYROLL_NUMBER:", item.payroll.payrollNumber);
  console.log("PAYROLL_STATUS:", item.payroll.status);
  console.log("MONTH_YEAR:", item.payroll.month, "/", item.payroll.year);
  console.log("EMPLOYEE_ID:", item.employee.id);
  console.log("EMPLOYEE_NAME:", item.employee.name);
  console.log("EMPLOYEE_CODE:", item.employee.employeeCode);
  console.log("DESIGNATION:", item.employee.designation);
  console.log("JOINING_DATE:", item.employee.joiningDate);
  console.log("EMPLOYEE_SALARY (Gross):", item.employee.salary?.toString());
  console.log("EMPLOYEE_TYPE:", item.employee.employeeType?.name);
  console.log("ITEM_DATA:", JSON.stringify({
    basic: item.basic?.toString(),
    houseRent: item.houseRent?.toString(),
    medical: item.medical?.toString(),
    transport: item.transport?.toString(),
    foodAllowance: item.foodAllowance?.toString(),
    otAmount: item.otAmount?.toString(),
    bonus: item.bonus?.toString(),
    grossPay: item.grossPay?.toString(),
    absentDeduction: item.absentDeduction?.toString(),
    loanDeduction: item.loanDeduction?.toString(),
    taxDeduction: item.taxDeduction?.toString(),
    pfDeduction: item.pfDeduction?.toString(),
    tiffinAllowance: item.tiffinAllowance?.toString(),
    nightAllowance: item.nightAllowance?.toString(),
    holidayAllowance: item.holidayAllowance?.toString(),
    otherAllowance: item.otherAllowance?.toString(),
    lateDeduction: item.lateDeduction?.toString(),
    otherDeduction: item.otherDeduction?.toString(),
    customFine: item.customFine?.toString(),
    customBonus: item.customBonus?.toString(),
    totalDeduction: item.totalDeduction?.toString(),
    netPay: item.netPay?.toString(),
    status: item.status
  }, null, 2));

  console.log("EMPLOYEE_TYPE_POLICIES:", JSON.stringify({
    salaryStructure: item.employee.employeeType?.salaryStructurePolicy,
    attendance: item.employee.employeeType?.attendancePolicy,
    late: item.employee.employeeType?.latePolicy,
    overtime: item.employee.employeeType?.overtimePolicy,
    tiffin: item.employee.employeeType?.tiffinBillPolicy,
    night: item.employee.employeeType?.nightBillPolicy,
    holiday: item.employee.employeeType?.holidayBillPolicy,
  }, null, 2));

  // Also query attendance stats for this employee in month 9, 2026
  const startDate = new Date(item.payroll.year, item.payroll.month - 1, 1);
  const endDate = new Date(item.payroll.year, item.payroll.month, 0, 23, 59, 59, 999);

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: item.employeeId,
      date: { gte: startDate, lte: endDate }
    },
    include: {
      leaveApplication: {
        include: { leaveType: true }
      }
    }
  });

  const stats = attendances.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    acc.otHours += Number(curr.otHours || 0);
    acc.lateCountTotal += (Number(curr.lateCountValue) || 0) + (Number(curr.breakLateCountValue) || 0);
    acc.calculatedOvertimeAmount += Number(curr.calculatedOvertimeAmount || 0);
    acc.tiffinBillAmount += Number(curr.tiffinBillAmount || 0);
    acc.nightBillAmount += Number(curr.nightBillAmount || 0);
    acc.holidayBillAmount += Number(curr.holidayBillAmount || 0);
    return acc;
  }, {
    otHours: 0,
    lateCountTotal: 0,
    calculatedOvertimeAmount: 0,
    tiffinBillAmount: 0,
    nightBillAmount: 0,
    holidayBillAmount: 0,
  } as any);

  console.log("ATTENDANCE_STATS:", JSON.stringify({
    totalRecords: attendances.length,
    breakdownByStatus: stats,
  }, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
