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

    const gatewayId = req.headers.get("x-gateway-id");

    // 2. Fetch active biometric devices
    const dbDevices = await prisma.biometricDevice.findMany({
      where: { isActive: true },
    });

    // 3. Filter devices mapping to this gateway location
    const filtered = dbDevices.filter((d) => {
      if (!gatewayId) return true;
      if (d.location && d.location.toLowerCase() === gatewayId.toLowerCase()) return true;
      if (d.name && d.name.toLowerCase().includes(gatewayId.toLowerCase())) return true;
      // If location is blank, expose it to all gateways
      return !d.location;
    });

    // 4. Map db schema to agent expected structure
    const devices = filtered.map((d) => ({
      deviceId: d.id,
      vendor: d.vendor,
      name: d.name,
      ipAddress: d.ipAddress,
      port: d.port || 4370,
      serialNumber: d.serialNumber,
      username: "admin", // Default fallback
      password: d.apiKey || "", // Reuse the apiKey field to store connection credential/secret
      isActive: d.isActive
    }));

    return NextResponse.json({ success: true, devices });
  } catch (error) {
    console.error("Gateway config fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
