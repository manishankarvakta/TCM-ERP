import { prisma } from "../lib/prisma";
import { deletePayroll } from "../app/(dashboard)/dashboard/hr/payroll/_actions/payroll.action";

async function verifyDeletion() {
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

  console.log("\n🚀 Triggering deletePayroll...");
  const result = await deletePayroll(payroll.id);
  console.log("Result:", JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error("❌ Deletion action reported failure.");
    return;
  }

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
    console.log("\n🎉 SUCCESS: Delete payroll verification test passed end-to-end!");
  } else {
    console.error("\n❌ FAILURE: Verification conditions not met.");
  }
}

verifyDeletion().catch(err => {
  console.error("Verification crashed:", err);
});
