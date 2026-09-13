import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateDefaultShifts() {
  console.log("🔄 Updating default shift for employees without assigned shift...");

  // 1. Find or create Morning Shift
  let morningShift = await prisma.shift.findFirst({
    where: {
      OR: [
        { name: { contains: "Morning", mode: "insensitive" } },
        { name: { contains: "General", mode: "insensitive" } },
      ],
      isTrash: false,
    },
  });

  if (!morningShift) {
    const firstUser = await prisma.user.findFirst();
    morningShift = await prisma.shift.create({
      data: {
        name: "Morning Shift (General)",
        startTime: "09:00",
        endTime: "18:00",
        graceMinutes: 15,
        lateAfter: 30,
        halfDayAfter: 120,
        otStartAfter: 30,
        status: "active",
        createdBy: firstUser?.id || "system",
      },
    });
  }

  // 2. Update all employees where shiftId is null
  const updated = await prisma.employee.updateMany({
    where: {
      shiftId: null,
    },
    data: {
      shiftId: morningShift.id,
    },
  });

  console.log(`✅ SUCCESS: Assigned '${morningShift.name}' to ${updated.count} employees!`);
}

updateDefaultShifts()
  .catch((e) => {
    console.error("❌ Error updating default shifts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
