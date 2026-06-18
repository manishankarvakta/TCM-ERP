"use server";

import { prisma } from "@/lib/prisma";

export async function getDeviceOverview(id: string) {
  try {
    const device = await prisma.biometricDevice.findUnique({
      where: { id },
      include: {
        warehouse: { select: { name: true, code: true } },
        _count: { select: { deviceMappings: true } },
      },
    });
    if (!device) return { success: false, error: "Device not found" };
    return { success: true, device };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch device overview" };
  }
}

export async function getDeviceMappedUsers(deviceId: string) {
  try {
    const mappings = await prisma.employeeDeviceMap.findMany({
      where: { deviceId },
      include: {
        employee: { select: { name: true, employeeCode: true, designation: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, mappings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeviceAttendanceLogs(deviceId: string, limit: number = 20) {
  try {
    const logs = await prisma.attendanceLog.findMany({
      where: { deviceId },
      include: {
        employee: { select: { name: true, employeeCode: true } }
      },
      take: limit,
      orderBy: { timestamp: 'desc' }
    });
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeviceRawLogs(deviceId: string, limit: number = 10) {
  try {
    const logs = await prisma.biometricRawLog.findMany({
      where: { deviceId },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeviceSyncLogs(deviceId: string, limit: number = 10) {
  try {
    const logs = await prisma.biometricSyncLog.findMany({
      where: { deviceId },
      include: {
        user: { select: { name: true } }
      },
      take: limit,
      orderBy: { syncTime: 'desc' }
    });
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeviceUnmappedLogs(deviceSerialNumber: string | null, limit: number = 10) {
  if (!deviceSerialNumber) return { success: true, logs: [] };
  try {
    const logs = await prisma.unmappedBiometricLog.findMany({
      where: { deviceSerialNumber },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
