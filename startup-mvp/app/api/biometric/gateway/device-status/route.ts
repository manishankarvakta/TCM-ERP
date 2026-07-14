import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { syncTimezoneFromDb } from "@/lib/hr/shift-utils";

export async function POST(req: Request) {
  try {
    // Sync active timezone preference from database first
    await syncTimezoneFromDb();

    // 1. Basic security handshake
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Read additional gateway headers for logging and auditing
    const gatewayId = req.headers.get("x-gateway-id");
    const installationId = req.headers.get("x-installation-id");

    const body = await req.json();
    const { devices } = body;

    if (!devices || !Array.isArray(devices)) {
      return NextResponse.json({ error: "Invalid body. Expected devices array." }, { status: 400 });
    }

    console.log(`[DEVICE-STATUS] Gateway: ${gatewayId || "unknown"} | Installation: ${installationId || "unknown"} | Processing ${devices.length} status reports...`);

    let updatedDevicesCount = 0;

    // 2. Reconcile and update corresponding device records
    for (const d of devices) {
      if (!d.deviceId) continue;

      if (d.reachable) {
        // If reachable, update the last ping timestamp to current server time (avoids client timezone offset issues)
        await prisma.biometricDevice.update({
          where: { id: d.deviceId },
          data: { 
            lastPingAt: new Date(),
            // Ensure status remains active so the device stays online and functional
            status: "active"
          }
        }).catch((err) => {
          console.warn(`Failed to update lastPingAt for device ID ${d.deviceId}:`, err.message);
        });
        updatedDevicesCount++;
      } else {
        // If not reachable, we log the failure, but do NOT update lastPingAt so the UI correctly reflects offline state
        console.warn(`Device ${d.deviceId} reported unreachable by Gateway: ${gatewayId || "unknown"}`);
      }
    }

    // 3. Clear Next.js cache for the biometric and devices dashboard pages so they update in real-time
    if (updatedDevicesCount > 0) {
      try {
        revalidateBothPaths("hr/biometric/devices");
        revalidateBothPaths("hr/attendance/devices");
        revalidateBothPaths("hr/biometric/sync");
      } catch (e: any) {
        console.warn("Failed to revalidate paths:", e.message);
      }
    }

    // 4. Return 200 OK on success
    return NextResponse.json({ 
      success: true, 
      message: "Device status reports updated successfully" 
    });
  } catch (error) {
    console.error("Gateway device status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
