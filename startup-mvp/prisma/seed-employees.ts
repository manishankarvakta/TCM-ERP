import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding departments, shifts, and employees...");

  // Find first admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["admin", "superadmin"] } },
  });

  if (!adminUser) {
    console.error("No admin user found. Please run seed-users first.");
    return;
  }

  // Seed default shifts
  const morningShift = await prisma.shift.upsert({
    where: { id: "morning-shift-default" },
    create: {
      id: "morning-shift-default",
      name: "Morning Shift",
      startTime: "08:00",
      endTime: "16:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00",
      createdBy: adminUser.id,
    },
    update: {},
  });

  const eveningShift = await prisma.shift.upsert({
    where: { id: "evening-shift-default" },
    create: {
      id: "evening-shift-default",
      name: "Evening Shift",
      startTime: "16:00",
      endTime: "00:00",
      breakStartTime: "20:00",
      breakEndTime: "21:00",
      createdBy: adminUser.id,
    },
    update: {},
  });

  const nightShift = await prisma.shift.upsert({
    where: { id: "night-shift-default" },
    create: {
      id: "night-shift-default",
      name: "Night Shift",
      startTime: "00:00",
      endTime: "08:00",
      breakStartTime: "04:00",
      breakEndTime: "05:00",
      createdBy: adminUser.id,
    },
    update: {},
  });

  // Seed Departments
  const hrDept = await prisma.department.upsert({
    where: { id: "dept-hr-default" },
    create: {
      id: "dept-hr-default",
      name: "Human Resources",
      code: "HR",
      createdBy: adminUser.id,
    },
    update: {},
  });

  const opsDept = await prisma.department.upsert({
    where: { id: "dept-ops-default" },
    create: {
      id: "dept-ops-default",
      name: "Operations",
      code: "OPS",
      createdBy: adminUser.id,
    },
    update: {},
  });

  // Backfill unassigned employees to Morning Shift
  const updatedCount = await prisma.employee.updateMany({
    where: { shiftId: null },
    data: { shiftId: morningShift.id },
  });

  console.log(`Updated ${updatedCount.count} employees with default Morning Shift.`);
  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
