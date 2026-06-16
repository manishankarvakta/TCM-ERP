import { NextResponse } from "next/server";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";
import { prisma } from "@/lib/prisma";

// ADMS Initialization / Ping Endpoint
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN"); // Device Serial Number

  if (sn) {
    await prisma.biometricDevice.updateMany({
      where: { serialNumber: sn },
      data: { lastPingAt: new Date() },
    });
  }

  // ADMS Protocol requires a plain text "OK" response for initialization
  return new NextResponse("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ADMS Data Push Endpoint
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sn = url.searchParams.get("SN"); // Device Serial Number
    const table = url.searchParams.get("table"); // Device Table (ATTLOG, etc)
    
    // Find device by SN
    let deviceId = undefined;
    if (sn) {
      const device = await prisma.biometricDevice.findFirst({
        where: { serialNumber: sn }
      });
      if (device) {
        deviceId = device.id;
        await prisma.biometricDevice.update({
          where: { id: device.id },
          data: { lastPingAt: new Date() },
        });
      }
    }

    const rawText = await req.text();

    if (table === "ATTLOG" || table === "OPERLOG") {
      // 1. Store Raw Payload immediately
      await prisma.biometricRawLog.create({
        data: {
          deviceId,
          deviceSerialNumber: sn,
          rawData: rawText,
          source: "ADMS",
          syncStatus: "PENDING",
        }
      });

      if (table === "ATTLOG") {
        // ADMS format is tab separated: e.g., "1\t2026-06-16 15:10:29\t1" (EnrollNumber, Time, PunchType)
        const lines = rawText.split('\n').filter(line => line.trim().length > 0);
        const rawData = [];

        for (const line of lines) {
          const parts = line.split('\t');
          
          if (parts.length >= 2) {
            const pin = parts[0];
            const dateTime = parts[1];
            const punchType = parts[2] || "0";
            const verifyMode = parts[3] || "0";
            const workCode = parts[4] || "0";

            if (pin && dateTime.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
              const [date, time] = dateTime.split(' ');
              rawData.push({
                EnrollNumber: pin,
                Date: date,
                Time: time,
                PunchType: punchType,
                VerifyMode: verifyMode,
                WorkCode: workCode,
                DeviceID: sn || "ADMS"
              });
            }
          }
        }

        if (rawData.length > 0) {
          // Process sync
          await syncBiometricLogs({
            vendor: "ZKTeco",
            rawData,
            deviceId,
            syncedBy: "ADMS_PUSH",
          });
        }
      }
    }

    // ADMS expects "OK" on success
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error) {
    console.error("ADMS Push Error:", error);
    // Still return OK so the device doesn't get stuck in a retry loop infinitely
    return new NextResponse("OK", { status: 200 }); 
  }
}
