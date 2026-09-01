import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";
import { syncTimezoneFromDb } from "@/lib/hr/shift-utils";

export async function POST(req: Request) {
  try {
    await syncTimezoneFromDb();

    // 1. Bearer Token Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    if (token !== (process.env.BIOMETRIC_API_KEY || "default-secret-key")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const body = await req.json();
    const { commandId, status = "COMPLETED", vendor = "ZKTeco", deviceId, rawData } = body;

    console.log(`📡 [GATEWAY SYNC-RANGE] Command: ${commandId} | Device: ${deviceId || "N/A"} | Logs: ${rawData?.length || 0}`);

    let syncLogId: string | undefined = undefined;

    // 2. Ingest historical logs into BullMQ worker queue if rawData present
    if (rawData && Array.isArray(rawData) && rawData.length > 0) {
      const syncResult = await syncBiometricLogs({
        vendor,
        rawData,
        deviceId,
        syncedBy: null,
      });

      if (syncResult.success) {
        syncLogId = syncResult.syncLogId;
      }
    }

    // 3. Update BiometricCommand record status
    if (commandId) {
      await prisma.biometricCommand.update({
        where: { id: commandId },
        data: {
          status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
          updatedAt: new Date(),
        },
      }).catch(async () => {
        // Fallback: try searching by payloadJson if cuid match fails
        const cmd = await prisma.biometricCommand.findFirst({
          where: {
            OR: [
              { id: commandId },
              { payloadJson: { contains: commandId } }
            ]
          }
        });
        if (cmd) {
          await prisma.biometricCommand.update({
            where: { id: cmd.id },
            data: { status: status === "COMPLETED" ? "COMPLETED" : "FAILED" }
          }).catch(() => null);
        }
      });
    }

    return NextResponse.json({
      success: true,
      commandId,
      syncLogId,
      processedLogs: rawData?.length || 0,
    });
  } catch (error: any) {
    console.error("Gateway sync-range endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
