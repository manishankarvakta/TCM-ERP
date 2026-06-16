"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidateBothPaths } from "@/lib/route-utils-server";

/**
 * Get all biometric devices
 */
export async function getBiometricDevices() {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const devices = await prisma.biometricDevice.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, devices };
  } catch (error) {
    return { success: false, error: "Failed to fetch devices" };
  }
}

/**
 * Upsert Biometric Device
 */
export async function upsertBiometricDevice(data: any) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canEdit = await hasPermission(session.user.id, "hr.attendance", "edit");
    if (!canEdit) return { success: false, error: "Permission denied" };

    const { id, ...rest } = data;

    if (id) {
      await prisma.biometricDevice.update({
        where: { id },
        data: rest,
      });
    } else {
      await prisma.biometricDevice.create({
        data: {
          ...rest,
          createdBy: session.user.id,
        },
      });
    }

    revalidateBothPaths("hr/attendance/devices");
    return { success: true, message: "Device saved successfully" };
  } catch (error) {
    console.error("upsertBiometricDevice error:", error);
    return { success: false, error: "Failed to save device" };
  }
}

/**
 * Delete Biometric Device
 */
export async function deleteBiometricDevice(id: string) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const canDelete = await hasPermission(session.user.id, "hr.attendance", "delete");
    if (!canDelete) return { success: false, error: "Permission denied" };

    const deleted = await prisma.biometricDevice.delete({
      where: { id },
    });

    revalidateBothPaths("hr/attendance/devices");
    return { success: true, message: "Device deleted" };
  } catch (error) {
    console.error("deleteBiometricDevice error:", error);
    return { success: false, error: "Failed to delete device" };
  }
}

/**
 * Check Device Connection
 * Attempts to open a TCP socket to the device IP
 */
export async function checkDeviceConnection(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device) return { success: false, error: "Device not found" };

    if (device.connectionType === "WEB_API" || !device.ipAddress) {
      return { success: false, error: "Cannot ping Cloud/ADMS devices directly. The device must push data to the server." };
    }

    // Try to open a TCP socket
    const net = require("net");
    const port = device.port || 4370;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000); // 3 seconds timeout

      socket.on("connect", async () => {
        socket.destroy();
        await prisma.biometricDevice.update({
          where: { id },
          data: { lastPingAt: new Date() },
        });
        revalidateBothPaths("hr/attendance/devices");
        resolve({ success: true, message: "Device is Online!" });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ success: false, error: "Connection timed out. Device is Offline." });
      });

      socket.on("error", (err: any) => {
        socket.destroy();
        resolve({ success: false, error: `Connection failed: ${err.message}` });
      });

      socket.connect(port, device.ipAddress!);
    });
  } catch (error) {
    console.error("checkDeviceConnection error:", error);
    return { success: false, error: "Failed to check connection" };
  }
}
