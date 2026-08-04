import { prisma } from "../lib/prisma";

async function checkAll() {
  const payrolls = await prisma.payroll.findMany({
    include: { creator: true }
  });
  console.log("All Payrolls (including trashed):", JSON.stringify(payrolls.map(p => ({
    id: p.id,
    payrollNumber: p.payrollNumber,
    month: p.month,
    year: p.year,
    status: p.status,
    isTrash: p.isTrash,
    totalAmount: p.totalAmount.toString(),
    createdAt: p.createdAt
  })), null, 2));
}

checkAll();
