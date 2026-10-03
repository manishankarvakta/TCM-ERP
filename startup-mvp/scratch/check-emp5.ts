import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { employeeCode: 'EMP1000005' },
    include: {
      shift: true,
      salaryStructure: true,
      employeeType: true
    }
  });

  console.log('=== EMP1000005 Details ===');
  console.log({
    id: emp?.id,
    name: emp?.name,
    code: emp?.employeeCode,
    shiftId: emp?.shiftId,
    shiftName: emp?.shift?.name,
    shiftAllowOvertime: emp?.shift?.allowOvertime,
    shiftOtStartAfter: emp?.shift?.otStartAfter,
    salary: emp?.salary,
    overtimeRateFormula: (emp?.salaryStructure as any)?.overtimeRateFormula,
    overtimeHourlyRate: (emp?.salaryStructure as any)?.overtimeHourlyRate,
  });

  console.log('\n=== All Shifts in DB ===');
  const shifts = await prisma.shift.findMany();
  for (const s of shifts) {
    console.log(`Shift ID: ${s.id} | Name: ${s.name} | AllowOT: ${s.allowOvertime} | otStartAfter: ${s.otStartAfter}`);
  }

  console.log('\n=== Payroll Item for EMP1000005 in Payroll cmumi9vcp001uusos5afv9mgm ===');
  const payrollItem = await prisma.payrollItem.findFirst({
    where: {
      payrollId: 'cmumi9vcp001uusos5afv9mgm',
      employee: { employeeCode: 'EMP1000005' }
    }
  });
  console.log(payrollItem);

  console.log('\n=== Attendance Records for EMP1000005 (Non-zero OT or Calculated OT) ===');
  const attendances = await prisma.attendance.findMany({
    where: {
      employee: { employeeCode: 'EMP1000005' },
      date: {
        gte: new Date('2026-09-01'),
        lte: new Date('2026-09-30')
      }
    },
    include: { shift: true }
  });

  for (const a of attendances) {
    console.log({
      id: a.id,
      date: a.date.toISOString().split('T')[0],
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workHours: a.workHours,
      otHours: a.otHours,
      calculatedOvertimeAmount: a.calculatedOvertimeAmount,
      policyCalculationNote: a.policyCalculationNote,
      shiftIdInAttendance: a.shiftId,
      shiftNameInAttendance: a.shift?.name,
      shiftAllowOTInAttendance: a.shift?.allowOvertime,
      isLocked: a.isLocked
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
