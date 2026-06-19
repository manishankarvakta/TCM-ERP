import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, rows } = body;

    if (!deviceId || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
      select: { serialNumber: true }
    });

    if (!device) {
      return NextResponse.json({ error: "Biometric device not found" }, { status: 404 });
    }

    const sn = device.serialNumber || "UNKNOWN_SN";
    const rawDataToSync = [];
    let duplicatesSkipped = 0;
    let importedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      const { PIN, Time, DeviceID, Status, Verified, WorkCode } = row;
      
      // Basic validation (more strict validation is done on the client)
      if (!PIN || !Time) {
        failedCount++;
        continue;
      }

      const [date, time] = Time.split(' ');
      const isoDateTime = new Date(Time);
      
      // Prevent duplicate via DB constraint
      try {
        await prisma.biometricRawLog.create({
          data: {
            deviceId,
            deviceSerialNumber: sn,
            deviceUserId: String(PIN),
            punchTime: isoDateTime,
            rawData: JSON.stringify(row),
            source: "CSV_IMPORT",
            syncStatus: "PENDING",
          }
        });
        
        rawDataToSync.push({
          EnrollNumber: String(PIN),
          Date: date,
          Time: time,
          PunchType: String(Status || "0"),
          VerifyMode: String(Verified || "1"),
          WorkCode: String(WorkCode || "0"),
          DeviceID: sn
        });
        
        importedCount++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          duplicatesSkipped++;
        } else {
          console.error("CSV Row Insert Error:", err);
          failedCount++;
        }
      }
    }

    if (rawDataToSync.length > 0) {
      // Call existing sync service to process AttendanceLog and UnmappedBiometricLog
      await syncBiometricLogs({
        vendor: "ZKTeco",
        rawData: rawDataToSync,
        deviceId,
        syncedBy: "CSV_IMPORT"
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rows.length,
        importedCount,
        duplicatesSkipped,
        failedCount
      }
    });

  } catch (error) {
    console.error("CSV Import API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
