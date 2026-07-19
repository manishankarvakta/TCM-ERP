import { prisma } from "@/lib/prisma";
import { Employee, BiometricDevice, EmployeeDeviceMap } from "@prisma/client";

/**
 * 1. Safety Gates
 */
export function assertBiometricUserSyncEnabled() {
  const isEnabled = process.env.BIOMETRIC_USER_SYNC_ENABLED === "true";
  if (!isEnabled) {
    throw new Error("Biometric user sync is disabled. Complete Phase 2 real device command verification before enabling.");
  }
}

export function assertBiometricSingleUserSyncTestEnabled() {
  const isEnabled = process.env.BIOMETRIC_SINGLE_USER_SYNC_TEST_ENABLED === "true";
  if (!isEnabled) {
    throw new Error("Single-user biometric sync test is disabled.");
  }
}

export async function hasSuccessfulAdmsCommandAck(deviceId: string): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.biometricCommand.count({
    where: {
      deviceId,
      status: "ACKNOWLEDGED",
      commandType: { in: ["TEST_INFO", "TEST_CHECK", "TEST_USERINFO"] },
      updatedAt: { gte: twentyFourHoursAgo }
    }
  });
  return count > 0;
}

/**
 * 2. Validate Device User Mapping Priority
 */
export function validateDeviceUserMapping(
  employee: Employee, 
  device: BiometricDevice,
  existingMapping?: EmployeeDeviceMap | null
) {
  let valid = false;
  let deviceUserId: string | undefined;
  let reason: string | undefined;

  // Rule 1: Use existing mapping if it exists
  if (existingMapping && existingMapping.deviceUserId) {
    deviceUserId = existingMapping.deviceUserId;
  }
  // Rule 2: Fallback to employee.biometricDeviceId if present
  else if (employee.biometricDeviceId) {
    deviceUserId = employee.biometricDeviceId;
  }
  // Rule 3: Fallback to numeric-only extraction of employeeCode
  else if (employee.employeeCode) {
    const numericMatch = employee.employeeCode.match(/\d+/);
    if (numericMatch) {
      deviceUserId = numericMatch[0];
    }
  }

  if (deviceUserId && /^\d+$/.test(deviceUserId)) {
    valid = true;
  } else {
    valid = false;
    reason = "Could not derive a safe, numeric deviceUserId for this employee.";
  }

  // Name sanitization (MB360 ADMS doesn't like tabs/newlines)
  const name = employee.name.replace(/[\t\n\r]/g, " ").substring(0, 24);

  return {
    valid,
    reason,
    deviceUserId,
    employeeCode: employee.employeeCode || undefined,
    name
  };
}

/**
 * 3. Dry-Run Payload Generator
 */
export function generateUserInfoCommandPayload(deviceUserId: string, name: string) {
  // ADMS Format: DATA UPDATE USERINFO PIN=1001\tName=John\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000
  // Note: NEVER QUEUE THIS TO THE DB DURING PHASE 3A
  return `DATA UPDATE USERINFO PIN=${deviceUserId}\tName=${name}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000000000`;
}

/**
 * 4. Sync Preview Service
 */
export async function getDeviceUserSyncPreview(deviceId: string) {
  const device = await prisma.biometricDevice.findUnique({
    where: { id: deviceId }
  });

  if (!device) throw new Error("Device not found");

  // Get all active and inactive employees
  const employees = await prisma.employee.findMany({
    where: { status: { in: ["active", "inactive"] } },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      biometricDeviceId: true
    }
  });

  const existingMappings = await prisma.employeeDeviceMap.findMany({
    where: { deviceId }
  });

  let readyCount = 0;
  let blockedCount = 0;
  const rows = [];
  const generatedIds = new Set<string>();

  for (const emp of employees) {
    const mapping = existingMappings.find(m => m.employeeId === emp.id);
    const validation = validateDeviceUserMapping(emp as any, device, mapping);

    const warnings: string[] = [];
    const blockers: string[] = [];
    let status: "READY" | "NOT_READY" | "DUPLICATE" | "ALREADY_MAPPED" = "NOT_READY";

    if (mapping) {
      status = "ALREADY_MAPPED";
      readyCount++;
    } else if (!validation.valid) {
      status = "NOT_READY";
      blockers.push(validation.reason || "Invalid ID strategy.");
      blockedCount++;
    } else {
      status = "READY";
      readyCount++;
    }

    if (validation.valid && validation.deviceUserId) {
      if (generatedIds.has(validation.deviceUserId)) {
        status = "DUPLICATE";
        warnings.push("Duplicate deviceUserId detected across multiple active employees.");
      } else {
        generatedIds.add(validation.deviceUserId);
      }
    }

    let dryRunCommandText;
    if (validation.valid && validation.deviceUserId && validation.name) {
      dryRunCommandText = generateUserInfoCommandPayload(validation.deviceUserId, validation.name);
    }

    rows.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode || "-",
      name: emp.name,
      deviceUserId: validation.deviceUserId || "-",
      status,
      dryRunCommandText,
      warnings,
      blockers
    });
  }

  return {
    deviceId: device.id,
    serialNumber: device.serialNumber,
    totalEmployees: employees.length,
    readyCount,
    blockedCount,
    rows
  };
}

/**
 * 5. Create Missing Mappings (Dry Run Enabler)
 * Only creates mappings in the DB with status DRY_RUN_READY, doesn't sync yet.
 */
export async function createMissingMappings(deviceId: string) {
  const preview = await getDeviceUserSyncPreview(deviceId);
  const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId }});
  
  if (!device) throw new Error("Device not found");

  let createdCount = 0;

  for (const row of preview.rows) {
    if (row.status === "READY" && row.deviceUserId !== "-") {
      await prisma.employeeDeviceMap.create({
        data: {
          employeeId: row.employeeId,
          deviceId: device.id,
          deviceUserId: row.deviceUserId,
          syncStatus: "DRY_RUN_READY",
        }
      });
      createdCount++;

      // Minimal audit log for mapping creation
      console.log(`[AUDIT] Created EmployeeDeviceMap for emp ${row.employeeId} on device ${device.serialNumber}`);
    }
  }

  return { success: true, createdCount };
}
