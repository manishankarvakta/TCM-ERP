import { prisma } from "../lib/prisma";

async function checkPayrolls() {
  const payrolls = await prisma.payroll.findMany({
    where: { isTrash: false }
  });
  console.log("Payrolls in database:", JSON.stringify(payrolls.map(p => ({
    id: p.id,
    payrollNumber: p.payrollNumber,
    month: p.month,
    year: p.year,
    status: p.status,
    totalAmount: p.totalAmount.toString()
  })), null, 2));
}

checkPayrolls();
