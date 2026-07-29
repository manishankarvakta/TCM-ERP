import { prisma } from "../lib/prisma";

async function cleanup() {
  console.log("Cleaning up test payroll, fines, and bonuses...");
  
  // Find employee id for Md Ismail Hossen
  const employee = await prisma.employee.findFirst({
    where: { name: "Md Ismail Hossen" }
  });

  if (employee) {
    const employeeId = employee.id;
    await prisma.employeeFine.deleteMany({
      where: { employeeId, reason: "Mock Disciplinary Fine" }
    });
    await prisma.employeeBonus.deleteMany({
      where: { employeeId, reason: "Mock Performance Bonus" }
    });
  }

  await prisma.payroll.deleteMany({
    where: { month: 7, year: 2026 }
  });

  console.log("Cleanup finished successfully!");
}

cleanup();
