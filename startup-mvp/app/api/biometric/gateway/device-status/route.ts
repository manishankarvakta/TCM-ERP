import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { devices } = body;

    if (Array.isArray(devices)) {
      for (const d of devices) {
        if (d.reachable) {
          await prisma.biometricDevice.update({
            where: { id: d.deviceId },
            data: { lastPingAt: new Date(d.lastCheckedAt) }
          }).catch(() => null);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gateway device status update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
