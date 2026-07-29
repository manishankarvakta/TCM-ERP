import { prisma } from "../lib/prisma";
import { isWeekend } from "date-fns";
import { reprocessAttendancePoliciesForDateRange } from "../lib/hr-payroll/attendance-policy-service";

async function populateMock() {
  console.log("1. Fetching active employees...");
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: { id: true, shiftId: true }
  });
  console.log(`Found ${employees.length} active employees.`);

  const startDay = 1;
  const endDay = 22;
  const year = 2026;
  const month = 7; // July

  const startDate = new Date(year, month - 1, startDay);
  const endDate = new Date(year, month - 1, endDay, 23, 59, 59, 999);

  console.log(`2. Loading existing attendance records for July 1 - 22...`);
  const existing = await prisma.attendance.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    },
    select: { employeeId: true, date: true }
  });

  const existingSet = new Set(
    existing.map(r => `${r.employeeId}_${r.date.toISOString().split("T")[0]}`)
  );
  console.log(`Found ${existing.length} existing attendance records in this range.`);

  console.log(`3. Generating new records...`);
  const recordsToCreate: any[] = [];

  for (let day = startDay; day <= endDay; day++) {
    // Construct local date at 00:00 UTC to represent db date
    const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    const isWeekendDay = isWeekend(date);

    for (const emp of employees) {
      const key = `${emp.id}_${dateStr}`;
      if (existingSet.has(key)) continue;

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
        // Weekday: 09:55 AM local check-in (03:55 AM UTC)
        // 07:18 PM local check-out (13:18 PM UTC)
        const checkIn = new Date(`${dateStr}T03:55:23.000Z`);
        const checkOut = new Date(`${dateStr}T13:18:43.000Z`);

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

  console.log(`4. Inserting ${recordsToCreate.length} new records into database...`);
  // Insert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < recordsToCreate.length; i += batchSize) {
    const batch = recordsToCreate.slice(i, i + batchSize);
    await prisma.attendance.createMany({
      data: batch
    });
    console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(recordsToCreate.length / batchSize)}`);
  }

  console.log(`5. Triggering batch policy reprocessing for July 2026 to calculate statuses, hours, and OT...`);
  const reprocessResult = await reprocessAttendancePoliciesForDateRange({
    fromDate: `${year}-${month.toString().padStart(2, "0")}-01`,
    toDate: `${year}-${month.toString().padStart(2, "0")}-31`,
    force: true
  });
  console.log("Reprocess Results:", JSON.stringify(reprocessResult, null, 2));

  console.log("🎉 Done populating and reprocessing successfully!");
}

populateMock();
