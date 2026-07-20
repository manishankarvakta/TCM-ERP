import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // 1. Basic security handshake
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // 2. Fetch active biometric devices with TCP/IP connection mode
    const dbDevices = await prisma.biometricDevice.findMany({
      where: { 
        isActive: true,
        connectionMode: "TCP_IP"
      },
    });

    // 3. Map db schema to agent expected structure (no filtering by gatewayId needed)
    const devices = dbDevices.map((d) => ({
      deviceId: d.id,
      vendor: d.vendor,
      deviceType: d.deviceType,
      name: d.name,
      ipAddress: d.ipAddress,
      port: d.port || 4370,
      serialNumber: d.serialNumber,
      username: d.username || "admin",
      password: d.password || d.apiKey || "",
      isActive: d.isActive
    }));

    return NextResponse.json({ success: true, devices });
  } catch (error) {
    console.error("Gateway config fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
