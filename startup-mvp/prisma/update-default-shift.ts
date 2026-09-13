import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating unassigned employees to Morning Shift...");

  const morningShift = await prisma.shift.findFirst({
    where: { name: { contains: "Morning", mode: "insensitive" } },
  });

  if (!morningShift) {
    console.error("No Morning Shift found in database.");
    return;
  }

  const res = await prisma.employee.updateMany({
    where: {
      OR: [{ shiftId: null }, { shiftId: "" }],
    },
    data: {
      shiftId: morningShift.id,
    },
  });

  console.log(`Successfully assigned default Morning Shift (${morningShift.name}) to ${res.count} employees.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
