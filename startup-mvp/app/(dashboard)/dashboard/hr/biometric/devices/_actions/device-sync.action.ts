"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { differenceInMinutes } from "date-fns";

/**
 * Validates permission to sync or view commands
 */
async function validateSyncAuth(action: "sync" | "view" = "sync"): Promise<{ success: boolean; userId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const permissionKey = action === "sync" ? "hr.biometric.sync" : "hr.biometric.view";
  const canPerform = await hasPermission(session.user.id, permissionKey as any, "manage" as any);
  if (!canPerform) return { success: false, error: "Permission denied" };

  return { success: true, userId: session.user.id };
}

/**
 * Evaluate if the device is currently online based on ADMS lastPingAt
 */
export async function checkDeviceStatus(deviceId: string) {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
      select: { id: true, serialNumber: true, lastPingAt: true, name: true }
    });

    if (!device || !device.serialNumber) {
      return { success: false, error: "Device not found or missing Serial Number" };
    }

    const isOnline = device.lastPingAt 
      ? differenceInMinutes(new Date(), new Date(device.lastPingAt)) <= 5 
      : false;

    // We can also queue an INFO command to get hardware specifics
    await prisma.biometricCommand.create({
      data: {
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber,
        commandType: "CHECK_STATUS",
        commandText: `C:100:INFO`, // This ID 100 will be overridden or parsed safely, we just need a unique ID for the handshake
        status: "QUEUED", // It will be picked up by ADMS polling
        requestedById: authRes.userId,
      }
    });

    return { 
      success: true, 
      isOnline, 
      lastPingAt: device.lastPingAt,
      message: isOnline ? "Device is currently online. INFO ping queued." : "Device is offline. INFO ping queued." 
    };
  } catch (error: any) {
    console.error("checkDeviceStatus error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch User Sync Preview (Phase 3A)
 */
export async function fetchDeviceUserSyncPreview(deviceId: string) {
  try {
    const authRes = await validateSyncAuth("view");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const { getDeviceUserSyncPreview } = await import("@/lib/hr/biometric/user-sync-service");
    const preview = await getDeviceUserSyncPreview(deviceId);

    return { success: true, preview };
  } catch (error: any) {
    console.error("fetchDeviceUserSyncPreview error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Missing Mappings (Dry Run Phase 3A)
 */
export async function generateMissingDeviceUserMappings(deviceId: string) {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const { createMissingMappings } = await import("@/lib/hr/biometric/user-sync-service");
    const result = await createMissingMappings(deviceId);

    return { 
      success: true, 
      message: `Successfully created ${result.createdCount} new mappings as DRY_RUN_READY.`,
      createdCount: result.createdCount 
    };
  } catch (error: any) {
    console.error("generateMissingDeviceUserMappings error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue Single User Sync Test (Phase 3B)
 */
export async function queueSingleUserInfoSyncTest({ deviceId, employeeId }: { deviceId: string, employeeId: string }) {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const { 
      assertBiometricSingleUserSyncTestEnabled, 
      hasSuccessfulAdmsCommandAck,
      getDeviceUserSyncPreview
    } = await import("@/lib/hr/biometric/user-sync-service");

    assertBiometricSingleUserSyncTestEnabled();

    const hasAck = await hasSuccessfulAdmsCommandAck(deviceId);
    if (!hasAck) {
      return { success: false, error: "BLOCKED: Phase 2 real device ACK not confirmed within the last 24 hours." };
    }

    const preview = await getDeviceUserSyncPreview(deviceId);
    const row = preview.rows.find(r => r.employeeId === employeeId);

    if (!row) return { success: false, error: "Employee not found in device scope." };
    if (row.status !== "READY" && row.status !== "ALREADY_MAPPED") {
      return { success: false, error: `Employee is not ready for sync. Status: ${row.status}` };
    }
    if (!row.dryRunCommandText || !row.dryRunCommandText.startsWith("DATA UPDATE USERINFO PIN=")) {
      return { success: false, error: "Invalid generated payload." };
    }

    // Safety checks on the payload
    if (row.dryRunCommandText.includes("DELETE") || row.dryRunCommandText.includes("CLEAR") || row.dryRunCommandText.includes("REBOOT")) {
      return { success: false, error: "Generated payload contains destructive commands." };
    }

    const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
    if (!device) return { success: false, error: "Device not found." };

    // Queue exactly ONE command
    const command = await prisma.biometricCommand.create({
      data: {
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber || "",
        commandType: "PHASE_3B_SINGLE_USER_TEST",
        commandText: row.dryRunCommandText,
        status: "QUEUED",
      }
    });

    // Update mapping status
    await prisma.employeeDeviceMap.updateMany({
      where: { employeeId, deviceId },
      data: { syncStatus: "READY" } // Temporarily mark as READY or SYNC_TEST_QUEUED if enum allows. We'll just use READY. Wait, enum has NO SYNC_TEST_QUEUED. Let's use READY, but devicecmd sets it to SYNCED.
    });

    return { 
      success: true, 
      message: "Single-user sync test queued successfully.",
      commandId: command.id 
    };
  } catch (error: any) {
    console.error("queueSingleUserInfoSyncTest error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue a command to sync all mapped users to the specific device
 */
export async function queueSyncUsersToDevice(deviceId: string) {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
      include: {
        deviceMappings: {
          where: { isActive: true },
          include: { employee: true }
        }
      }
    });

    if (!device || !device.serialNumber) {
      return { success: false, error: "Device not found or missing SN." };
    }

    const usersToSync = device.deviceMappings.map(m => ({
      deviceUserId: m.deviceUserId,
      name: m.employee.name,
      employeeId: m.employee.id
    }));

    if (usersToSync.length === 0) {
      return { success: false, error: "No mapped active users found for this device." };
    }

    // Format the command lines. E.g. DATA UPDATE USERINFO PIN=1\tName=John
    // Note: ZKTeco requires \t separation. We'll join commands with newlines if multiple, or queue multiple commands.
    // For safety in Phase 6, we only push the FIRST mapped user to avoid flooding the device during testing.
    const testUser = usersToSync[0];
    const commandText = `C:200:DATA UPDATE USERINFO PIN=${testUser.deviceUserId}\tName=${testUser.name}\tPri=0\tGrp=1\tTZ=0000100100000000`;

    const command = await prisma.biometricCommand.create({
      data: {
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber,
        commandType: "SYNC_USERS",
        commandText,
        status: "PENDING_DEVICE_VERIFICATION",
        payloadJson: JSON.stringify([testUser]), // We only test one user for Phase 6
        requestedById: authRes.userId,
        errorMessage: "Requires hardware MB360 syntax verification before dispatch."
      }
    });

    return { 
      success: true, 
      message: `Queued test user sync (PIN: ${testUser.deviceUserId}). Awaiting hardware syntax verification.`,
      command 
    };
  } catch (error: any) {
    console.error("queueSyncUsersToDevice error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Queue a command to resend attendance logs from the device
 */
export async function queueSyncAttendanceLogs(deviceId: string) {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
      select: { id: true, serialNumber: true }
    });

    if (!device || !device.serialNumber) {
      return { success: false, error: "Device not found." };
    }

    // Command to pull all un-pushed attendance logs
    // DATA QUERY ATTLOG StartTime=2024-01-01 00:00:00 EndTime=2024-12-31 23:59:59
    const commandText = `C:300:DATA QUERY ATTLOG`;

    const command = await prisma.biometricCommand.create({
      data: {
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber,
        commandType: "SYNC_ATTENDANCE",
        commandText,
        status: "PENDING_DEVICE_VERIFICATION",
        requestedById: authRes.userId,
        errorMessage: "Log pull requires validated firmware command execution."
      }
    });

    return { 
      success: true, 
      message: "Log sync queued successfully. Awaiting hardware verification.",
      command
    };
  } catch (error: any) {
    console.error("queueSyncAttendanceLogs error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Orchestrator to run checks and queue full sync
 */
export async function queueFullDeviceSync(deviceId: string) {
  try {
    const statusRes = await checkDeviceStatus(deviceId);
    const usersRes = await queueSyncUsersToDevice(deviceId);
    const logsRes = await queueSyncAttendanceLogs(deviceId);

    return {
      success: true,
      message: "Full sync orchestration queued.",
      details: {
        status: statusRes,
        users: usersRes,
        logs: logsRes
      }
    };
  } catch (error: any) {
    console.error("queueFullDeviceSync error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch the command history for a device
 */
export async function getDeviceSyncCommands({
  deviceId,
  limit = 20,
}: {
  deviceId: string;
  limit?: number;
}) {
  try {
    const authRes = await validateSyncAuth("view");
    if (!authRes.success) return { success: false, error: authRes.error || "Auth error" };

    const commands = await prisma.biometricCommand.findMany({
      where: { deviceId },
      include: {
        requestedBy: { select: { name: true } }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, commands };
  } catch (error: any) {
    console.error("getDeviceSyncCommands error:", error);
    return { success: false, error: error.message, commands: [] };
  }
}

/**
 * Queue safe test commands for Phase 2 ADMS verification
 */
export async function queueTestCommand(deviceId: string, testType: "INFO" | "CHECK" | "USERINFO") {
  try {
    const authRes = await validateSyncAuth("sync");
    if (!authRes.success) return authRes;

    const device = await prisma.biometricDevice.findUnique({
      where: { id: deviceId },
      select: { id: true, serialNumber: true }
    });

    if (!device || !device.serialNumber) {
      return { success: false, error: "Device not found." };
    }

    let commandText = "";
    if (testType === "INFO") {
      commandText = "INFO";
    } else if (testType === "CHECK") {
      commandText = "CHECK";
    } else if (testType === "USERINFO") {
      commandText = "DATA QUERY USERINFO";
    }

    const command = await prisma.biometricCommand.create({
      data: {
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber,
        commandType: `TEST_${testType}`,
        commandText,
        status: "QUEUED",
        requestedById: authRes.userId,
      }
    });

    return { 
      success: true, 
      message: `Test command ${testType} queued successfully.`,
      command
    };
  } catch (error: any) {
    console.error("queueTestCommand error:", error);
    return { success: false, error: error.message };
  }
}
