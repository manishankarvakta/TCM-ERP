import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP1000005' },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      shiftId: true,
      shift: true,
      rosterEntries: {
        where: {
          date: {
            gte: new Date('2026-09-01'),
            lte: new Date('2026-09-30')
          }
        },
        include: { shift: true },
        orderBy: { date: 'asc' }
      }
    }
  });

  console.log('Employee:', emp?.name, emp?.employeeCode);
  console.log('Master Shift assigned in Employee table:', emp?.shift);
  console.log('Roster Entries in September 2026:');
  for (const r of emp?.rosterEntries || []) {
    console.log({
      date: r.date.toISOString().split('T')[0],
      shiftName: r.shift?.name,
      shiftAllowOT: r.shift?.allowOvertime,
      isOffDay: r.isOffDay
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
