import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP1000005' },
    include: { shift: true }
  });
  console.log('EMP1000005 Shift in Employee table:', emp?.shift);

  const shifts = await prisma.shift.findMany();
  console.log('\nAll Shifts in database:');
  for (const s of shifts) {
    console.log({
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      allowOvertime: s.allowOvertime,
      otStartAfter: s.otStartAfter,
      status: s.status,
      isTrash: s.isTrash
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
