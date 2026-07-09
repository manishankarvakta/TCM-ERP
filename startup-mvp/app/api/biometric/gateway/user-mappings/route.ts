import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetches expected user mappings for active devices of this gateway
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const gatewayId = req.headers.get("x-gateway-id");

    // 1. Fetch active devices belonging to this gateway
    const devices = await prisma.biometricDevice.findMany({
      where: { isActive: true },
      select: { id: true, location: true, name: true }
    });

    const filteredDeviceIds = devices
      .filter((d) => {
        if (!gatewayId) return true;
        if (d.location && d.location.toLowerCase() === gatewayId.toLowerCase()) return true;
        if (d.name && d.name.toLowerCase().includes(gatewayId.toLowerCase())) return true;
        return !d.location;
      })
      .map((d) => d.id);

    if (filteredDeviceIds.length === 0) {
      return NextResponse.json({ success: true, mappings: [] });
    }

    // 2. Fetch expected mappings for these devices
    const mappings = await prisma.employeeDeviceMap.findMany({
      where: {
        deviceId: { in: filteredDeviceIds }
      },
      select: {
        deviceId: true,
        deviceUserId: true,
        employeeId: true,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, mappings });
  } catch (error) {
    console.error("Gateway fetch user mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Updates status mappings reports from local gateway
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    const { reports } = body;

    if (!reports || !Array.isArray(reports)) {
      return NextResponse.json({ error: "Invalid body. Expected reports array." }, { status: 400 });
    }

    const now = new Date();

    for (const r of reports) {
      const { deviceId, deviceUserId, status, error } = r;

      if (!deviceId || !deviceUserId || !status) continue;

      // Update mapping status in the DB
      await prisma.employeeDeviceMap.update({
        where: {
          deviceId_deviceUserId: {
            deviceId,
            deviceUserId
          }
        },
        data: {
          syncStatus: status === "SYNCED" ? "SYNCED" : "FAILED",
          lastSyncStatus: status,
          lastSyncError: error || null,
          lastSyncedAt: now
        }
      }).catch((e) => {
        // Log error but continue with other updates (e.g. if mapping was deleted)
        console.warn(`Failed to update EmployeeDeviceMap for device ${deviceId} / user ${deviceUserId}:`, e.message);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gateway update user mappings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
