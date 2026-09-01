import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTimezoneFromDb } from "@/lib/hr/shift-utils";

export async function POST(req: Request) {
  try {
    await syncTimezoneFromDb();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    const { gatewayId, status, pendingLogs, failedLogs, activeDevices } = body;

    console.log(`💓 [HEARTBEAT] Gateway: ${gatewayId} | Status: ${status} | Pending: ${pendingLogs} | Failed: ${failedLogs} | Active Devices: ${activeDevices}`);

    // 1. Fetch active devices and perform flexible location matching for this gateway
    const devices = await prisma.biometricDevice.findMany({
      where: { isActive: true },
      select: { id: true, location: true, name: true, serialNumber: true }
    });

    const matchingDevices = devices.filter((d) => {
      if (!gatewayId) return true;
      if (d.location && d.location.toLowerCase() === gatewayId.toLowerCase()) return true;
      if (d.name && d.name.toLowerCase().includes(gatewayId.toLowerCase())) return true;
      return !d.location;
    });

    const matchingDeviceIds = matchingDevices.map((d) => d.id);
    const matchingSerialNumbers = matchingDevices
      .map((d) => d.serialNumber)
      .filter((sn): sn is string => Boolean(sn));

    // Update lastPingAt for matched active devices
    if (matchingDeviceIds.length > 0) {
      await prisma.biometricDevice.updateMany({
        where: { id: { in: matchingDeviceIds } },
        data: { lastPingAt: new Date() }
      }).catch(() => null);
    }

    // 2. Fetch pending commands queued for these devices or serial numbers
    let pendingCommands: any[] = [];
    if (matchingDeviceIds.length > 0 || matchingSerialNumbers.length > 0) {
      const dbCommands = await prisma.biometricCommand.findMany({
        where: {
          status: { in: ["QUEUED", "PENDING"] },
          OR: [
            { deviceId: { in: matchingDeviceIds } },
            { deviceSerialNumber: { in: matchingSerialNumbers } }
          ]
        },
        orderBy: { createdAt: "asc" }
      });

      if (dbCommands.length > 0) {
        pendingCommands = dbCommands.map((cmd) => {
          let parsedPayload: any = null;
          if (cmd.payloadJson) {
            try {
              parsedPayload = JSON.parse(cmd.payloadJson);
            } catch {
              parsedPayload = cmd.payloadJson;
            }
          }

          return {
            id: cmd.id,
            commandType: cmd.commandType,
            commandText: cmd.commandText,
            deviceId: cmd.deviceId,
            deviceSerialNumber: cmd.deviceSerialNumber,
            payload: parsedPayload,
          };
        });

        // Mark fetched commands as SENT to prevent duplicate dispatches
        const cmdIds = dbCommands.map((c) => c.id);
        await prisma.biometricCommand.updateMany({
          where: { id: { in: cmdIds } },
          data: { status: "SENT" }
        }).catch(() => null);
      }
    }

    return NextResponse.json({
      success: true,
      pendingCommands,
    });
  } catch (error) {
    console.error("Gateway heartbeat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

