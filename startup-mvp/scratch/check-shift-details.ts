import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP1000005' },
    include: {
      shift: true,
      salaryStructure: true,
      employeeType: true,
      rosterEntries: {
        include: { shift: true }
      }
    }
  });

  console.log('Employee:', {
    id: emp?.id,
    name: emp?.name,
    code: emp?.employeeCode,
    shiftId: emp?.shiftId,
    shift: emp?.shift,
    salaryStructure: emp?.salaryStructure
  });

  console.log('\nAll Shifts:');
  const shifts = await prisma.shift.findMany();
  console.log(shifts);

  console.log('\nRoster Entries for EMP1000005:');
  console.log(emp?.rosterEntries);

  console.log('\nOvertime Policies:');
  const otPolicies = await prisma.overtimePolicy.findMany();
  console.log(otPolicies);

  console.log('\nOvertime Records (table Overtime):');
  const otRecords = await prisma.overtime.findMany({
    where: { employee: { employeeCode: 'EMP1000005' } }
  });
  console.log(otRecords);
}

main().catch(console.error).finally(() => prisma.$disconnect());
