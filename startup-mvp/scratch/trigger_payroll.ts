import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const month = 5;
  const year = 2026;

  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found for seeding.");

  console.log(`Check if payroll exists for ${month}/${year}...`);
  const existing = await prisma.payroll.findFirst({
    where: { month, year, isTrash: false }
  });

  if (existing) {
    console.log("Payroll already exists. Deleting to re-generate...");
    await prisma.payrollItem.deleteMany({ where: { payrollId: existing.id } });
    await prisma.payroll.delete({ where: { id: existing.id } });
  }

  // Manually run a simplified version of generatePayroll logic
  const employees = await prisma.employee.findMany({ where: { status: "active" } });
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = endDate.getDate();

  const attendanceRecords = await prisma.attendance.findMany({
    where: { date: { gte: startDate, lte: endDate } }
  });

  const attendanceByEmployee = attendanceRecords.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) acc[curr.employeeId] = { absentDays: 0 };
    if (curr.status === "ABSENT") acc[curr.employeeId].absentDays += 1;
    return acc;
  }, {} as any);

  const loans = await prisma.employeeLoan.findMany({
    where: { status: "APPROVED", remainingBalance: { gt: 0 } }
  });

  const loansByEmployee = loans.reduce((acc, curr) => {
    if (!acc[curr.employeeId]) acc[curr.employeeId] = [];
    acc[curr.employeeId].push(curr);
    return acc;
  }, {} as any);

  const payrollNumber = `PR-${year}-${month.toString().padStart(2, "0")}`;
  
  const payroll = await prisma.payroll.create({
    data: {
      payrollNumber,
      month,
      year,
      status: "DRAFT",
      totalAmount: 0,
      createdBy: user.id
    }
  });

  let grandTotal = 0;
  for (const emp of employees) {
    const basic = Number(emp.salary) || 0;
    const att = attendanceByEmployee[emp.id] || { absentDays: 0 };
    const dailyRate = basic / daysInMonth;
    const absentDeduction = att.absentDays * dailyRate;

    let loanDeduction = 0;
    const empLoans = loansByEmployee[emp.id] || [];
    for (const loan of empLoans) {
      const deduction = Math.min(Number(loan.monthlyInstallment), Number(loan.remainingBalance));
      loanDeduction += deduction;
    }

    const netPay = basic - absentDeduction - loanDeduction;
    grandTotal += netPay;

    await prisma.payrollItem.create({
      data: {
        payrollId: payroll.id,
        employeeId: emp.id,
        basic,
        grossPay: basic,
        absentDeduction,
        loanDeduction,
        totalDeduction: absentDeduction + loanDeduction,
        netPay,
        status: "unpaid",
      }
    });
  }

  await prisma.payroll.update({
    where: { id: payroll.id },
    data: { totalAmount: grandTotal }
  });

  console.log(`Payroll generated successfully with ${employees.length} items. Total: ${grandTotal}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
