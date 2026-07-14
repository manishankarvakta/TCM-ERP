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

    // Update lastPingAt for devices mapped to this gateway location
    if (gatewayId) {
      await prisma.biometricDevice.updateMany({
        where: {
          location: gatewayId,
          isActive: true
        },
        data: {
          lastPingAt: new Date()
        }
      }).catch(() => null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gateway heartbeat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
