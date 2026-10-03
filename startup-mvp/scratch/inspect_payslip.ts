import { prisma } from "../lib/prisma";

async function main() {
  const payrollId = "cmunww056000pmd01g2epa6po";
  const itemId = "cmunx07pc001bmd01txd58x3i";

  const payroll = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: { creator: true, approver: true, voucher: true, paymentVoucher: true }
  });

  const payrollItem = await prisma.payrollItem.findUnique({
    where: { id: itemId },
    include: {
      employee: {
        include: {
          shift: true,
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
          },
          resignations: true,
          loans: true,
        }
      },
      payroll: true,
    }
  });

  console.log("=== PAYROLL ===");
  console.log(JSON.stringify(payroll, null, 2));

  console.log("=== PAYROLL ITEM ===");
  console.log(JSON.stringify(payrollItem, null, 2));

  if (payrollItem?.employeeId && payroll) {
    const startDate = new Date(payroll.year, payroll.month - 1, 1);
    const endDate = new Date(payroll.year, payroll.month, 0, 23, 59, 59, 999);
    
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: payrollItem.employeeId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: "asc" }
    });
    console.log("=== ATTENDANCES (Count: " + attendances.length + ") ===");
    console.log(JSON.stringify(attendances, null, 2));

    const fines = await prisma.employeeFine.findMany({
      where: {
        employeeId: payrollItem.employeeId,
        fineDate: { gte: startDate, lte: endDate }
      }
    });
    console.log("=== FINES ===");
    console.log(JSON.stringify(fines, null, 2));

    const bonuses = await prisma.employeeBonus.findMany({
      where: {
        employeeId: payrollItem.employeeId,
        bonusDate: { gte: startDate, lte: endDate }
      }
    });
    console.log("=== BONUSES ===");
    console.log(JSON.stringify(bonuses, null, 2));

    const defaultSalaryPolicy = await prisma.salaryStructurePolicy.findFirst({
      where: { isDefault: true }
    });
    console.log("=== DEFAULT SALARY POLICY ===");
    console.log(JSON.stringify(defaultSalaryPolicy, null, 2));

    const payrollSetting = await prisma.payrollSetting.findFirst({
      where: { status: "active", isDefault: true }
    });
    console.log("=== PAYROLL SETTING ===");
    console.log(JSON.stringify(payrollSetting, null, 2));
  }
}

main().catch(console.error).finally(() => process.exit(0));
