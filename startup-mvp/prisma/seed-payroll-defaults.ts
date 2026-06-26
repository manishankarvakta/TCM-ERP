import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding default payroll settings & policy templates...");

  // Find or create admin user to associate with createdBy
  let admin = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!admin) {
    admin = await prisma.user.findFirst({
      where: { email: "admin@example.com" },
    });
  }

  const creatorId = admin ? admin.id : null;

  // 1. Salary Structure Policy
  const salaryStructureName = "Default Gross Salary Structure";
  await prisma.salaryStructurePolicy.upsert({
    where: { id: "default-salary-structure" },
    update: {
      name: salaryStructureName,
      basicPercent: 55.00,
      houseRentPercent: 26.00,
      medicalPercent: 5.00,
      transportPercent: 4.00,
      foodPercent: 10.00,
      isDefault: true,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-salary-structure",
      name: salaryStructureName,
      basicPercent: 55.00,
      houseRentPercent: 26.00,
      medicalPercent: 5.00,
      transportPercent: 4.00,
      foodPercent: 10.00,
      isDefault: true,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Salary Structure Policy seeded.");

  // 2. Attendance Policy
  const attendancePolicyName = "Default Attendance Policy";
  await prisma.attendancePolicy.upsert({
    where: { id: "default-attendance-policy" },
    update: {
      name: attendancePolicyName,
      isEnabled: true,
      isEligibleForAttendanceBonus: false,
      bonusCalculationType: "NONE",
      attendanceBonusAmount: 0.00,
      applyAbsentPenalty: true,
      applyLatePenalty: true,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-attendance-policy",
      name: attendancePolicyName,
      isEnabled: true,
      isEligibleForAttendanceBonus: false,
      bonusCalculationType: "NONE",
      attendanceBonusAmount: 0.00,
      applyAbsentPenalty: true,
      applyLatePenalty: true,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Attendance Policy seeded.");

  // 3. Late Policy
  const latePolicyName = "Default Late Policy";
  await prisma.latePolicy.upsert({
    where: { id: "default-late-policy" },
    update: {
      name: latePolicyName,
      isEnabled: true,
      resetLateEveryMonth: true,
      lateCountPeriod: "MONTHLY",
      enableLateToAbsentConversion: false,
      lateDaysForOneAbsent: 3,
      lateCountForBonusLoss: 3,
      deductSalaryForLate: false,
      deductAttendanceBonusForLate: true,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-late-policy",
      name: latePolicyName,
      isEnabled: true,
      resetLateEveryMonth: true,
      lateCountPeriod: "MONTHLY",
      enableLateToAbsentConversion: false,
      lateDaysForOneAbsent: 3,
      lateCountForBonusLoss: 3,
      deductSalaryForLate: false,
      deductAttendanceBonusForLate: true,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Late Policy seeded.");

  // 4. Overtime Policy
  const overtimePolicyName = "Default No OT Policy";
  await prisma.overtimePolicy.upsert({
    where: { id: "default-no-ot-policy" },
    update: {
      name: overtimePolicyName,
      isEligible: false,
      calculationType: "FORMULA",
      basicPercentageFromGross: 60.00,
      monthlyWorkingDays: 30,
      hourBasis: "ASSIGNED_SHIFT_HOUR",
      multiplier: 2.00,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-no-ot-policy",
      name: overtimePolicyName,
      isEligible: false,
      calculationType: "FORMULA",
      basicPercentageFromGross: 60.00,
      monthlyWorkingDays: 30,
      hourBasis: "ASSIGNED_SHIFT_HOUR",
      multiplier: 2.00,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Overtime Policy seeded.");

  // 5. Tiffin Bill Policy
  const tiffinPolicyName = "Default No Tiffin Policy";
  await prisma.tiffinBillPolicy.upsert({
    where: { id: "default-no-tiffin-policy" },
    update: {
      name: tiffinPolicyName,
      isEligible: false,
      amount: 0.00,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-no-tiffin-policy",
      name: tiffinPolicyName,
      isEligible: false,
      amount: 0.00,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Tiffin Policy seeded.");

  // 6. Night Bill Policy
  const nightBillPolicyName = "Default No Night Bill Policy";
  await prisma.nightBillPolicy.upsert({
    where: { id: "default-no-night-bill-policy" },
    update: {
      name: nightBillPolicyName,
      isEligible: false,
      amount: 0.00,
      supportsOvernightCheckout: true,
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-no-night-bill-policy",
      name: nightBillPolicyName,
      isEligible: false,
      amount: 0.00,
      supportsOvernightCheckout: true,
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Night Bill Policy seeded.");

  // 7. Holiday Bill Policy
  const holidayBillPolicyName = "Default No Holiday Bill Policy";
  await prisma.holidayBillPolicy.upsert({
    where: { id: "default-no-holiday-bill-policy" },
    update: {
      name: holidayBillPolicyName,
      isEligible: false,
      calculationType: "ONE_DAY_GROSS",
      status: "active",
      isTrash: false,
    },
    create: {
      id: "default-no-holiday-bill-policy",
      name: holidayBillPolicyName,
      isEligible: false,
      calculationType: "ONE_DAY_GROSS",
      status: "active",
      isTrash: false,
      createdBy: creatorId,
    },
  });
  console.log("✔ Holiday Bill Policy seeded.");

  // 8. Payroll Setting
  const payrollSettingName = "Default Payroll Setting";
  await prisma.payrollSetting.upsert({
    where: { id: "default-payroll-setting" },
    update: {
      name: payrollSettingName,
      defaultMonthlyWorkingDays: 30,
      defaultPayDivisor: 30,
      defaultCurrency: "BDT",
      roundingMethod: "NONE",
      allowNegativeNetSalary: false,
      payrollLockAfterApproval: true,
      recalculateLockedPayroll: false,
      isDefault: true,
      status: "active",
    },
    create: {
      id: "default-payroll-setting",
      name: payrollSettingName,
      defaultMonthlyWorkingDays: 30,
      defaultPayDivisor: 30,
      defaultCurrency: "BDT",
      roundingMethod: "NONE",
      allowNegativeNetSalary: false,
      payrollLockAfterApproval: true,
      recalculateLockedPayroll: false,
      isDefault: true,
      status: "active",
    },
  });
  console.log("✔ Payroll Setting seeded.");

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
