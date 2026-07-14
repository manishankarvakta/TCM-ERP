import { NextResponse } from "next/server";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";
import { prisma } from "@/lib/prisma";
import { syncTimezoneFromDb } from "@/lib/hr/shift-utils";

export async function POST(req: Request) {
  try {
    await syncTimezoneFromDb();
    
    // Basic Security: Check for API Key in headers
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    
    // In a real app, verify against an env variable or device apiKey
    // For MVP, we allow a hardcoded default-secret-key
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    console.log("📥 [SYNC API] Received payload:", JSON.stringify(body, null, 2));
    const { vendor, rawData, deviceId } = body;

    if (!vendor || !rawData || !Array.isArray(rawData)) {
      return NextResponse.json({ error: "Invalid payload format. Expected vendor and rawData array." }, { status: 400 });
    }

    // Update lastPingAt if deviceId is provided
    if (deviceId) {
      await prisma.biometricDevice.update({
        where: { id: deviceId },
        data: { lastPingAt: new Date() },
      }).catch(() => null); // Ignore if device doesn't exist
    }

    // Process sync
    const result = await syncBiometricLogs({
      vendor,
      rawData,
      deviceId,
      syncedBy: null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, syncLogId: result.syncLogId });

  } catch (error) {
    console.error("Biometric API sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
