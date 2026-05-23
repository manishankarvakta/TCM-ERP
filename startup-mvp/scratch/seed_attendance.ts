import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    take: 5
  });

  if (employees.length === 0) {
    console.log("No active employees found to seed attendance.");
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // Current month (0-indexed)

  console.log(`Seeding attendance for ${employees.length} employees for month ${month + 1}/${year}...`);

  for (const emp of employees) {
    for (let day = 1; day <= 15; day++) {
      const date = new Date(year, month, day);
      
      const checkIn = new Date(year, month, day, 9, 0, 0);
      const checkOut = new Date(year, month, day, 18, 0, 0);

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: date
          }
        },
        update: {
          status: "PRESENT",
          checkIn: checkIn,
          checkOut: checkOut,
          workHours: 9
        },
        create: {
          employeeId: emp.id,
          date: date,
          status: "PRESENT",
          checkIn: checkIn,
          checkOut: checkOut,
          workHours: 9
        }
      });
    }
  }

  console.log("Attendance seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
