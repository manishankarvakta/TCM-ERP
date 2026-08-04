import { prisma } from "../lib/prisma";
import { getPayrollSettings, isConfiguredWeekend } from "../lib/payroll-settings";
import { reprocessAttendancePoliciesForDateRange } from "../lib/hr-payroll/attendance-policy-service";
import { Decimal } from "@prisma/client/runtime/library";

async function populateAllMockData() {
  console.log("🚀 Starting HR & Payroll Mock Data Seeding for July 2026...");

  // 1. Get first system user for auditor logs
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("❌ No users found in database. Cannot set creator IDs.");
    return;
  }
  console.log(`👤 Using Auditor User: ${user.name} (${user.id})`);

  // 2. Fetch all active employees
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { id: true, name: true, shiftId: true }
  });
  console.log(`👥 Found ${employees.length} active employees.`);
  if (employees.length === 0) {
    console.error("❌ No active employees found. Please onboard employees first.");
    return;
  }

  // 3. Clean up July 2026 data to ensure idempotency and cleanliness
  const year = 2026;
  const month = 7; // July
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month - 1, 31, 23, 59, 59, 999);

  console.log("🧹 Cleaning up old mock data for July 2026...");
  
  const deletedAttendance = await prisma.attendance.deleteMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  console.log(`Deleted ${deletedAttendance.count} attendance records.`);

  const deletedLoans = await prisma.employeeLoan.deleteMany({
    where: { purpose: { startsWith: "Mock Employee Loan" } }
  });
  console.log(`Deleted ${deletedLoans.count} mock loan records.`);

  const deletedFines = await prisma.employeeFine.deleteMany({
    where: { reason: { startsWith: "Mock Fine" } }
  });
  console.log(`Deleted ${deletedFines.count} mock fine records.`);

  const deletedBonuses = await prisma.employeeBonus.deleteMany({
    where: { reason: { startsWith: "Mock Bonus" } }
  });
  console.log(`Deleted ${deletedBonuses.count} mock bonus records.`);

  // 4. Fetch weekend configuration settings
  const settingRecord = await prisma.settings.findFirst({
    where: { code: "payroll.settings", isActive: true },
    orderBy: { createdAt: "desc" }
  });
  let weekends = [0, 6];
  if (settingRecord && (settingRecord.settings as any)?.calculation?.weekends) {
    weekends = (settingRecord.settings as any).calculation.weekends;
  }
  console.log("📅 Configured weekend day indices:", weekends);

  // 5. Populate and process
  const attendanceToCreate: any[] = [];
  const loansToCreate: any[] = [];
  const finesToCreate: any[] = [];
  const bonusesToCreate: any[] = [];

  for (const emp of employees) {
    // 5.1 Ensure EmployeeSalary structure exists so tax/PF calculations have percentages
    const existingSalary = await prisma.employeeSalary.findUnique({
      where: { employeeId: emp.id }
    });
    if (!existingSalary) {
      await prisma.employeeSalary.create({
        data: {
          employeeId: emp.id,
          basic: new Decimal(0),
          houseRent: new Decimal(0),
          medical: new Decimal(0),
          transport: new Decimal(0),
          foodAllowance: new Decimal(0),
          taxPercentage: new Decimal(10.00), // 10% mock tax
          pfPercentage: new Decimal(5.00),   // 5% mock PF
        }
      });
    }

    // 5.2 Generate Active Loan
    loansToCreate.push({
      employeeId: emp.id,
      amount: new Decimal(15000.00),
      monthlyInstallment: new Decimal(1500.00),
      remainingBalance: new Decimal(15000.00),
      issueDate: new Date("2026-07-01"),
      tenureMonths: 10,
      purpose: "Mock Employee Loan - July 2026",
      status: "APPROVED",
      createdBy: user.id,
      approvedBy: user.id
    });

    // 5.3 Generate Active Fine
    finesToCreate.push({
      employeeId: emp.id,
      amount: new Decimal(350.00),
      fineDate: new Date("2026-07-15"),
      reason: "Mock Fine - July 2026",
      status: "APPROVED",
      createdBy: user.id,
      approvedBy: user.id
    });

    // 5.4 Generate Active Bonus
    bonusesToCreate.push({
      employeeId: emp.id,
      amount: new Decimal(1200.00),
      bonusDate: new Date("2026-07-25"),
      reason: "Mock Bonus - July 2026",
      status: "APPROVED",
      createdBy: user.id,
      approvedBy: user.id
    });

    // 5.5 Generate Attendance Records for 1st to 31st of July
    for (let day = 1; day <= 31; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const isWeekendDay = isConfiguredWeekend(date, weekends);

      if (isWeekendDay) {
        attendanceToCreate.push({
          employeeId: emp.id,
          date,
          shiftId: emp.shiftId,
          status: "WEEKEND",
          checkIn: null,
          checkOut: null,
          isManual: false
        });
      } else {
        const rand = Math.random();

        // 5% chance of being ABSENT
        if (rand < 0.05) {
          attendanceToCreate.push({
            employeeId: emp.id,
            date,
            shiftId: emp.shiftId,
            status: "ABSENT",
            checkIn: null,
            checkOut: null,
            isManual: false
          });
        } else {
          // Determine Check-in (Starts at 10:00 AM local time / 04:00 AM UTC)
          let checkInTime = `${dateStr}T03:52:00.000Z`; // On time: 09:52 AM local
          let checkOutTime = `${dateStr}T13:05:00.000Z`; // On time: 07:05 PM local (starts at 07:00 PM local / 13:00 UTC)

          const behaviorRand = Math.random();
          if (behaviorRand < 0.15) {
            // LATE check-in (10:25 AM local / 04:25 AM UTC)
            checkInTime = `${dateStr}T04:25:00.000Z`;
          } else if (behaviorRand < 0.45) {
            // OVERTIME check-out (08:45 PM local / 14:45 PM UTC)
            checkOutTime = `${dateStr}T14:45:00.000Z`;
          }

          attendanceToCreate.push({
            employeeId: emp.id,
            date,
            shiftId: emp.shiftId,
            status: "PRESENT",
            checkIn: new Date(checkInTime),
            checkOut: new Date(checkOutTime),
            isManual: false
          });
        }
      }
    }
  }

  // 6. Bulk inserts
  console.log(`📦 Bulk inserting ${loansToCreate.length} Loans...`);
  await prisma.employeeLoan.createMany({ data: loansToCreate });

  console.log(`📦 Bulk inserting ${finesToCreate.length} Fines...`);
  await prisma.employeeFine.createMany({ data: finesToCreate });

  console.log(`📦 Bulk inserting ${bonusesToCreate.length} Bonuses...`);
  await prisma.employeeBonus.createMany({ data: bonusesToCreate });

  console.log(`📦 Bulk inserting ${attendanceToCreate.length} Attendance records...`);
  const batchSize = 400;
  for (let i = 0; i < attendanceToCreate.length; i += batchSize) {
    const batch = attendanceToCreate.slice(i, i + batchSize);
    await prisma.attendance.createMany({ data: batch });
  }

  // 7. Reprocess Attendance Rules
  console.log("⚙️ Reprocessing attendance policies for July 2026...");
  const reprocessResult = await reprocessAttendancePoliciesForDateRange({
    fromDate: `${year}-${month.toString().padStart(2, "0")}-01`,
    toDate: `${year}-${month.toString().padStart(2, "0")}-31`,
    force: true
  });
  console.log("📊 Reprocess output:", JSON.stringify(reprocessResult, null, 2));

  console.log("🎉 Seeding complete! All active employees set up with mock data for July 2026.");
}

populateAllMockData()
  .catch(err => {
    console.error("❌ Seeding failed:", err);
  });
