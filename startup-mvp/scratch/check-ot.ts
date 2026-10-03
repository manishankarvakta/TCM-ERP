import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. EMPLOYEE EMP1000005 ===');
  const emp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP1000005' },
    include: {
      shift: true,
      salaryStructure: true,
      employeeType: true,
      rosterEntries: {
        where: {
          date: {
            gte: new Date('2026-09-01'),
            lte: new Date('2026-09-30')
          }
        },
        include: { shift: true }
      }
    }
  });
  console.log(JSON.stringify(emp, null, 2));

  console.log('\n=== 2. ALL SHIFTS ===');
  const shifts = await prisma.shift.findMany();
  console.log(JSON.stringify(shifts, null, 2));

  console.log('\n=== 3. OVERTIME POLICIES ===');
  const otPolicies = await prisma.overtimePolicy.findMany();
  console.log(JSON.stringify(otPolicies, null, 2));

  console.log('\n=== 4. PAYROLL RECORD cmumi9vcp001uusos5afv9mgm ===');
  const payroll = await prisma.payroll.findUnique({
    where: { id: 'cmumi9vcp001uusos5afv9mgm' },
    include: {
      items: {
        where: {
          employee: { employeeCode: 'EMP1000005' }
        }
      }
    }
  });
  console.log(JSON.stringify(payroll, null, 2));

  console.log('\n=== 5. ATTENDANCE FOR EMP1000005 IN SEP 2026 ===');
  if (emp) {
    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: emp.id,
        date: {
          gte: new Date('2026-09-01'),
          lte: new Date('2026-09-30')
        }
      },
      include: {
        shift: true
      },
      orderBy: { date: 'asc' }
    });
    console.log(JSON.stringify(attendances, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
