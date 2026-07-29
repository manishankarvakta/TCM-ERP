import { prisma } from "../lib/prisma";
import { getPayrollSettings, isConfiguredWeekend } from "../lib/payroll-settings";
import { reprocessAttendancePoliciesForDateRange } from "../lib/hr-payroll/attendance-policy-service";

async function repopulateJulyAttendance() {
  console.log("1. Fetching active employees...");
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { id: true, shiftId: true }
  });
  console.log(`Found ${employees.length} active employees.`);

  const year = 2026;
  const month = 7; // July
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month - 1, 31, 23, 59, 59, 999);

  console.log("2. Fetching configured weekend settings...");
  const settingRecord = await prisma.settings.findFirst({
    where: { code: "payroll.settings", isActive: true },
    orderBy: { createdAt: "desc" }
  });
  let weekends = [0, 6];
  if (settingRecord && (settingRecord.settings as any)?.calculation?.weekends) {
    weekends = (settingRecord.settings as any).calculation.weekends;
  }
  console.log("Configured weekend day indices:", weekends);

  console.log("3. Deleting existing attendance records for July 2026...");
  const deleted = await prisma.attendance.deleteMany({
    where: {
      date: { gte: startDate, lte: endDate }
    }
  });
  console.log(`Deleted ${deleted.count} existing attendance records.`);

  console.log("4. Generating new records based on configured weekends...");
  const recordsToCreate: any[] = [];

  for (let day = 1; day <= 31; day++) {
    const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const isWeekendDay = isConfiguredWeekend(date, weekends);

    for (const emp of employees) {
      if (isWeekendDay) {
        recordsToCreate.push({
          employeeId: emp.id,
          date,
          shiftId: emp.shiftId,
          status: "WEEKEND",
          checkIn: null,
          checkOut: null,
          isManual: false
        });
      } else {
        // Weekday: shift starts at 10:00 AM local (04:00 AM UTC), ends at 07:00 PM local (13:00 UTC)
        const isAbsent = Math.random() < 0.05; // 5% chance of being absent

        if (isAbsent) {
          recordsToCreate.push({
            employeeId: emp.id,
            date,
            shiftId: emp.shiftId,
            status: "ABSENT",
            checkIn: null,
            checkOut: null,
            isManual: false
          });
        } else {
          const rand = Math.random();
          let checkInHour = 3;
          let checkInMinute = Math.floor(Math.random() * 20) + 40; // 09:40 to 09:59 AM local
          if (rand < 0.2) {
            checkInHour = 4;
            checkInMinute = Math.floor(Math.random() * 40) + 5; // 10:05 to 10:45 AM local (LATE)
          }

          const rand2 = Math.random();
          let checkOutHour = 13;
          let checkOutMinute = Math.floor(Math.random() * 15); // 07:00 to 07:15 PM local
          if (rand2 < 0.35) {
            // Overtime: 08:00 to 10:30 PM local
            checkOutHour = 14 + Math.floor(Math.random() * 3); 
            checkOutMinute = Math.floor(Math.random() * 60);
          } else if (rand2 < 0.50) {
            // Early leave: 05:00 to 06:45 PM local
            checkOutHour = 11 + Math.floor(Math.random() * 2); 
            checkOutMinute = Math.floor(Math.random() * 45);
          }

          const checkIn = new Date(`${dateStr}T${checkInHour.toString().padStart(2, "0")}:${checkInMinute.toString().padStart(2, "0")}:00.000Z`);
          const checkOut = new Date(`${dateStr}T${checkOutHour.toString().padStart(2, "0")}:${checkOutMinute.toString().padStart(2, "0")}:00.000Z`);

          recordsToCreate.push({
            employeeId: emp.id,
            date,
            shiftId: emp.shiftId,
            status: "PRESENT",
            checkIn,
            checkOut,
            isManual: false
          });
        }
      }
    }
  }

  console.log(`5. Inserting ${recordsToCreate.length} new records into database...`);
  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < recordsToCreate.length; i += batchSize) {
    const batch = recordsToCreate.slice(i, i + batchSize);
    await prisma.attendance.createMany({
      data: batch
    });
    console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(recordsToCreate.length / batchSize)}`);
  }

  console.log("6. Triggering batch policy reprocessing for July 2026...");
  const reprocessResult = await reprocessAttendancePoliciesForDateRange({
    fromDate: `${year}-${month.toString().padStart(2, "0")}-01`,
    toDate: `${year}-${month.toString().padStart(2, "0")}-31`,
    force: true
  });
  console.log("Reprocess Results:", JSON.stringify(reprocessResult, null, 2));

  console.log("🎉 Repopulation and calculation completed successfully!");
}

repopulateJulyAttendance()
  .catch((err) => {
    console.error("Error repopulating:", err);
  });
