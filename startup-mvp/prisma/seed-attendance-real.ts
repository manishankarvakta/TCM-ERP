import { PrismaClient } from '@prisma/client';
import { eachDayOfInterval, isWeekend, format, addHours, addMinutes, setHours, setMinutes, parse } from 'date-fns';

const prisma = new PrismaClient();

async function run() {
  const targetYear = 2026;
  const targetMonth = 5; // May
  
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0); // May 31

  console.log(`Starting real attendance seed for ${format(startDate, 'MMMM yyyy')}...`);

  // Get references
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No users found in database');

  const employees = await prisma.employee.findMany();
  if (employees.length === 0) throw new Error('No employees found in database');

  // Find or create a shift
  let shift = await prisma.shift.findFirst();
  if (!shift) {
    console.log('No shift found, creating a default one (09:00 - 18:00)');
    shift = await prisma.shift.create({
      data: {
        name: 'General Shift',
        startTime: '09:00',
        endTime: '18:00',
        otStartAfter: 30,
        createdBy: user.id
      }
    });
  } else {
    console.log(`Using shift: ${shift.name} (${shift.startTime} - ${shift.endTime})`);
  }

  // Parse shift times
  const [startHr, startMin] = shift.startTime.split(':').map(Number);
  const [endHr, endMin] = shift.endTime.split(':').map(Number);

  // 1. Clean up existing attendance and overtime data for this month
  console.log('Removing all attendance and overtime for this month...');
  await prisma.attendance.deleteMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  await prisma.overtime.deleteMany({
    where: { date: { gte: startDate, lte: endDate } }
  });

  // 2. Seed Attendance for all employees
  console.log('Seeding attendance for all employees with checkIn/checkOut...');
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
  
  // We need to keep track of existing leaves so we don't overwrite them
  const leaves = await prisma.leaveApplication.findMany({
    where: { startDate: { lte: endDate }, endDate: { gte: startDate } }
  });

  for (const emp of employees) {
    const attendances = [];
    
    for (const day of daysInMonth) {
      // Check if employee is on leave this day
      const onLeave = leaves.find(l => l.employeeId === emp.id && day >= l.startDate && day <= l.endDate);
      
      const isWeekEnd = isWeekend(day);
      let status = isWeekEnd ? 'WEEKEND' : 'PRESENT';
      let workHours = isWeekEnd ? 0 : 8;
      let otHours = 0;
      let checkIn = null;
      let checkOut = null;
      let leaveAppId = null;

      if (onLeave) {
        status = 'LEAVE';
        workHours = 0;
        leaveAppId = onLeave.id;
      } else if (!isWeekEnd) {
        // Working day, set checkIn and checkOut
        checkIn = setMinutes(setHours(day, startHr), startMin);
        
        // Randomly add some minutes to checkIn (0-10 mins early/late)
        checkIn = addMinutes(checkIn, Math.floor(Math.random() * 20) - 10);
        
        checkOut = setMinutes(setHours(day, endHr), endMin);
        
        // Add random overtime for some days (20% chance)
        if (Math.random() > 0.8) {
          otHours = Math.floor(Math.random() * 3) + 1; // 1 to 3 hours OT
          checkOut = addHours(checkOut, otHours);
          
          // Randomly add a few minutes to checkout
          checkOut = addMinutes(checkOut, Math.floor(Math.random() * 15));
        } else {
          // Just random exit time within 15 mins after shift ends
          checkOut = addMinutes(checkOut, Math.floor(Math.random() * 15));
        }
      }

      attendances.push({
        employeeId: emp.id,
        date: day,
        shiftId: shift.id,
        checkIn,
        checkOut,
        status,
        workHours,
        otHours,
        isManual: false,
        leaveApplicationId: leaveAppId,
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
      ratePerHour: 150, // mock rate
      amount: a.otHours * 150,
      status: 'approved',
      createdBy: user.id
    }));
    
    if (otRecords.length > 0) {
      await prisma.overtime.createMany({
        data: otRecords
      });
    }
  }

  console.log('✅ Real attendance data with check-in/out seeded successfully!');
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
