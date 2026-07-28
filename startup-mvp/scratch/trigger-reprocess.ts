import { prisma } from "../lib/prisma";
import { reprocessUnknownPunchesByDeviceAndDate } from "../lib/biometric/reprocess-service";

// Wait, the path is @/lib/hr/biometric/reprocess-service, let's use the correct relative import:
// ../lib/hr/biometric/reprocess-service
import { reprocessUnknownPunchesByDeviceAndDate as reprocess } from "../lib/hr/biometric/reprocess-service";

async function runReprocess() {
  const deviceId = "cmrfy49dx005fpf0194sp8p3d";
  const fromDate = new Date("2026-07-28T00:00:00.000Z");
  const toDate = new Date("2026-07-28T23:59:59.999Z");

  console.log("🚀 Triggering reprocessing of unmapped/unresolved punches for device:", deviceId);
  
  try {
    const result = await reprocess(deviceId, fromDate, toDate);
    console.log("Reprocess Result:", JSON.stringify(result, null, 2));

    // Wait a brief moment for the BullMQ queue worker to process the sync job
    console.log("⏱️ Waiting 3 seconds for BullMQ background processor...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Fetch the updated logs and attendance record for Md Ismail Hossen (PIN 1382)
    const pin = "1382";
    const employee = await prisma.employee.findFirst({
      where: { biometricDeviceId: pin }
    });

    if (employee) {
      const logs = await prisma.attendanceLog.findMany({
        where: {
          employeeId: employee.id,
          timestamp: { gte: fromDate, lte: toDate }
        },
        orderBy: { timestamp: "asc" }
      });

      console.log("\nUpdated AttendanceLogs in Database (UTC):");
      console.log(JSON.stringify(logs.map(l => ({
        timestamp: l.timestamp.toISOString(),
        localTimeDhaka: new Date(l.timestamp.getTime() + 6 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", ""),
      })), null, 2));

      const attendance = await prisma.attendance.findFirst({
        where: {
          employeeId: employee.id,
          date: { gte: fromDate, lte: toDate }
        }
      });

      console.log("\nUpdated Attendance Record:");
      console.log(JSON.stringify(attendance ? {
        date: attendance.date.toISOString().split("T")[0],
        checkIn: attendance.checkIn ? new Date(attendance.checkIn.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
        checkOut: attendance.checkOut ? new Date(attendance.checkOut.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
        breakCheckOut: attendance.breakCheckOut ? new Date(attendance.breakCheckOut.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
        breakCheckIn: attendance.breakCheckIn ? new Date(attendance.breakCheckIn.getTime() + 6 * 60 * 60 * 1000).toISOString() : null,
        workHours: attendance.workHours,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes
      } : null, null, 2));
    }
  } catch (error) {
    console.error("Reprocessing failed:", error);
  }
}

runReprocess();
