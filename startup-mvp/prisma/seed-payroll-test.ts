import { PrismaClient, AttendanceStatus } from '@prisma/client';
import { eachDayOfInterval, isWeekend, format, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function run() {
  const targetYear = 2026;
  const targetMonth = 5; // May
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0); // May 31

  console.log(`Starting payroll test data seed for ${format(startDate, 'MMMM yyyy')}...`);

  // Get references
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No users found in database');
  }

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) {
    throw new Error('No employees found in database');
  }

  let leaveType = await prisma.leaveType.findFirst();
  if (!leaveType) {
    leaveType = await prisma.leaveType.create({
      data: {
        name: 'Sick Leave',
        category: 'SICK',
        defaultDays: 14,
        isPaid: true,
        createdBy: user.id
      }
    });
  }

  // 1. Clean up existing data for this month
  console.log('Cleaning up existing attendance, leave, and loan data for this month...');
  
  await prisma.attendance.deleteMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  
  await prisma.leaveApplication.deleteMany({
    where: { startDate: { gte: startDate, lte: endDate } }
  });
  
  await prisma.employeeLoan.deleteMany({
    where: { issueDate: { gte: startDate, lte: endDate } }
  });
  
  await prisma.overtime.deleteMany({
    where: { date: { gte: startDate, lte: endDate } }
  });

  // 2. Seed Attendance for all employees
  console.log('Seeding attendance for all employees...');
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  
  for (const emp of employees) {
    const attendances = [];
    
    for (const day of daysInMonth) {
      const isWeekEnd = isWeekend(day);
      let status: AttendanceStatus = isWeekEnd ? AttendanceStatus.WEEKEND : AttendanceStatus.PRESENT;
      let workHours = isWeekEnd ? 0 : 8;
      let otHours = 0;
      
      // Add random overtime for some days
      if (!isWeekEnd && Math.random() > 0.8) {
        otHours = Math.floor(Math.random() * 3) + 1;
      }

      attendances.push({
        employeeId: emp.id,
        date: day,
        status,
        workHours,
        otHours,
        isManual: false,
        createdBy: user.id
      });
    }

    await prisma.attendance.createMany({
      data: attendances
    });

    // Create overtime records for the OT hours
    const otRecords = attendances.filter(a => a.otHours > 0).map(a => ({
      employeeId: emp.id,
      date: a.date,
      hours: a.otHours,
      ratePerHour: 100, // mock rate
      amount: a.otHours * 100,
      status: 'approved',
      createdBy: user.id
    }));
    
    if (otRecords.length > 0) {
      await prisma.overtime.createMany({
        data: otRecords
      });
    }
  }

  // 3. Seed Leave for the first employee
  console.log('Seeding leave application...');
  const empWithLeave = employees[0];
  const leaveStart = new Date(targetYear, targetMonth - 1, 10);
  const leaveEnd = new Date(targetYear, targetMonth - 1, 12);
  
  const leaveApp = await prisma.leaveApplication.create({
    data: {
      employeeId: empWithLeave.id,
      leaveTypeId: leaveType.id,
      startDate: leaveStart,
      endDate: leaveEnd,
      totalDays: 3,
      reason: 'Fever and cold',
      status: 'HR_APPROVED',
      hrId: user.id,
      createdBy: user.id
    }
  });

  // Update attendance to 'LEAVE' for these days
  await prisma.attendance.updateMany({
    where: {
      employeeId: empWithLeave.id,
      date: { gte: leaveStart, lte: leaveEnd }
    },
    data: {
      status: 'LEAVE',
      workHours: 0,
      otHours: 0,
      leaveApplicationId: leaveApp.id
    }
  });

  // 4. Seed Loan for the second employee
  if (employees.length > 1) {
    console.log('Seeding employee loan...');
    const empWithLoan = employees[1];
    
    await prisma.employeeLoan.create({
      data: {
        employeeId: empWithLoan.id,
        amount: 5000,
        monthlyInstallment: 1000,
        remainingBalance: 5000,
        issueDate: new Date(targetYear, targetMonth - 1, 15),
        tenureMonths: 5,
        purpose: 'Medical emergency',
        status: 'APPROVED',
        approvedBy: user.id,
        createdBy: user.id
      }
    });
  }

  console.log('✅ Payroll test data seeded successfully!');
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
