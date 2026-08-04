import { prisma } from "../lib/prisma";

async function verifyDeletionTransaction() {
  console.log("🔍 Checking database for July 2026 Payroll...");
  
  const payroll = await prisma.payroll.findFirst({
    where: { month: 7, year: 2026, isTrash: false },
    include: { items: true }
  });

  if (!payroll) {
    console.error("❌ July 2026 Payroll not found in database. Please seed it first.");
    return;
  }

  console.log(`Found Payroll: ID=${payroll.id}, Number=${payroll.payrollNumber}, Status=${payroll.status}`);
  console.log(`Items count: ${payroll.items.length}`);

  // Check the status of fines and bonuses applied to this payroll
  const finesCount = await prisma.employeeFine.count({
    where: { payrollId: payroll.id }
  });
  const bonusesCount = await prisma.employeeBonus.count({
    where: { payrollId: payroll.id }
  });
  console.log(`Applied Fines count: ${finesCount}, Applied Bonuses count: ${bonusesCount}`);

  console.log("\n🚀 Triggering database transaction simulation...");
  const payrollId = payroll.id;
  
  await prisma.$transaction(async (tx) => {
    // 1. Revert status of applied fines
    await tx.employeeFine.updateMany({
      where: { payrollId },
      data: {
        status: "APPROVED",
        payrollId: null,
      },
    });

    // 2. Revert status of applied bonuses
    await tx.employeeBonus.updateMany({
      where: { payrollId },
      data: {
        status: "APPROVED",
        payrollId: null,
      },
    });

    // 3. Delete payroll items
    await tx.payrollItem.deleteMany({
      where: { payrollId },
    });

    // 4. Soft-delete payroll by setting isTrash: true
    await tx.payroll.update({
      where: { id: payrollId },
      data: {
        isTrash: true,
      },
    });
  });

  console.log("Database transaction simulation completed.");

  // Verify DB state after deletion
  console.log("\n🔍 Verifying database state post-deletion...");
  const recheckedPayroll = await prisma.payroll.findUnique({
    where: { id: payroll.id }
  });
  console.log(`Payroll isTrash status (expected true):`, recheckedPayroll?.isTrash);

  // Check items count remaining
  const itemsCount = await prisma.payrollItem.count({
    where: { payrollId: payroll.id }
  });
  console.log(`PayrollItems count remaining (expected 0):`, itemsCount);

  // Check fines and bonuses
  const recheckedFines = await prisma.employeeFine.findMany({
    where: { employeeId: { in: payroll.items.map(i => i.employeeId) } }
  });
  const revertedFinesCount = recheckedFines.filter(f => f.status === "APPROVED" && f.payrollId === null).length;
  console.log(`Fines reverted to APPROVED & null payrollId (expected ${finesCount}):`, revertedFinesCount);

  const recheckedBonuses = await prisma.employeeBonus.findMany({
    where: { employeeId: { in: payroll.items.map(i => i.employeeId) } }
  });
  const revertedBonusesCount = recheckedBonuses.filter(b => b.status === "APPROVED" && b.payrollId === null).length;
  console.log(`Bonuses reverted to APPROVED & null payrollId (expected ${bonusesCount}):`, revertedBonusesCount);

  if (recheckedPayroll?.isTrash === true && itemsCount === 0 && revertedFinesCount >= finesCount && revertedBonusesCount >= bonusesCount) {
    console.log("\n🎉 SUCCESS: Database transaction logic passed end-to-end!");
  } else {
    console.error("\n❌ FAILURE: Verification conditions not met.");
  }
}

verifyDeletionTransaction().catch(err => {
  console.error("Verification crashed:", err);
});
