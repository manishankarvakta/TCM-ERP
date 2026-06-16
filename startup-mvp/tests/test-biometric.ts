import { prisma } from "../lib/prisma";
import { processNormalizedChunk } from "../lib/hr/biometric/sync-service";
import { processBiometricAttendance } from "../lib/hr/biometric/processor";

async function runTest() {
  console.log("1. Finding an employee...");
  const emp = await prisma.employee.findFirst({ select: { id: true, employeeCode: true } });
  if (!emp) {
    console.log("❌ No employee found in the database. Cannot run test.");
    process.exit(1);
  }
  console.log("✅ Employee found:", emp.employeeCode);

  const todayDateObj = new Date();
  const today = todayDateObj.toISOString().split("T")[0]; // YYYY-MM-DD
  
  // Format matching ZKTeco
  const rawData = [
    {
      EnrollNumber: emp.employeeCode,
      Date: today,
      Time: "08:00:00",
    },
    {
      EnrollNumber: emp.employeeCode,
      Date: today,
      Time: "17:30:00",
    }
  ];

  console.log("2. Testing sync process (processNormalizedChunk) for ZKTeco...");
  const result = await processNormalizedChunk({
    vendor: "ZKTeco",
    rawData: rawData
  });
  console.log("✅ Sync Result:", result);

  console.log("3. Testing attendance processing (processBiometricAttendance)...");
  const start = new Date(`${today}T00:00:00Z`);
  const end = new Date(`${today}T23:59:59Z`);
  const procResult = await processBiometricAttendance(start, end, emp.id);
  console.log("✅ Process Result:", procResult);

  console.log("4. Verifying Attendance Record in DB...");
  const att = await prisma.attendance.findFirst({
    where: { employeeId: emp.id },
    orderBy: { date: 'desc' }
  });
  
  if (att) {
    console.log("✅ Final Attendance Record:");
    console.log(`   Check In:  ${att.checkIn}`);
    console.log(`   Check Out: ${att.checkOut}`);
    console.log(`   Status:    ${att.status}`);
    console.log(`   Work Hrs:  ${att.workHours}`);
  } else {
    console.log("❌ Attendance record was not generated.");
  }

  process.exit(0);
}

runTest().catch((e) => {
  console.error("Test Error:", e);
  process.exit(1);
});
