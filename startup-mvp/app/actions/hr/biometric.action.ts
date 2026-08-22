"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { syncBiometricLogs } from "@/lib/hr/biometric/sync-service";

export async function testDeviceConnection(ip: string, port: number = 4370) {
    try {
        const ZKLibModule = await import("node-zklib");
        const ZKLib = ZKLibModule.default || ZKLibModule;
        const zkInstance = new ZKLib(ip, port, 10000, 4000);
        await zkInstance.createSocket();
        
        const info = await zkInstance.getInfo();
        await zkInstance.disconnect();
        
        return { success: true, message: "Device is Online!", info };
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to connect to device" };
    }
}

export async function syncDeviceUsers(deviceId: string) {
    let device: any = null;
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
        if (!device || !device.ipAddress) {
            return { success: false, error: "Device or IP not found" };
        }

        const ZKLibModule = await import("node-zklib");
        const ZKLib = ZKLibModule.default || ZKLibModule;
        const zkInstance = new ZKLib(device.ipAddress, device.port || 4370, 10000, 4000);
        await zkInstance.createSocket();
        
        const users = await zkInstance.getUsers();
        await zkInstance.disconnect();
        
        // Log the sync attempt
        await prisma.biometricSyncLog.create({
            data: {
                deviceId,
                vendor: device.vendor,
                status: "SUCCESS",
                recordsCount: users?.data?.length || 0,
                syncedBy: session.user.id
            }
        });

        return { success: true, count: users?.data?.length || 0 };
    } catch (error: any) {
        const session = await auth();
        if (session?.user) {
            await prisma.biometricSyncLog.create({
                data: {
                    deviceId,
                    vendor: device?.vendor || "UNKNOWN",
                    status: "FAILED",
                    errorMessage: error.message || "Unknown error",
                    syncedBy: session.user.id
                }
            });
        }
        return { success: false, error: error.message };
    }
}

export async function syncDeviceAttendance(deviceId: string) {
    let device: any = null;
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
        if (!device || !device.ipAddress) {
            return { success: false, error: "Device or IP not found" };
        }

        let attendances: any = null;
        try {
            const ZKLibModule = await import("node-zklib");
            const ZKLib = ZKLibModule.default || ZKLibModule;
            const zkInstance = new ZKLib(device.ipAddress, device.port || 4370, 10000, 4000);
            await zkInstance.createSocket();
            attendances = await zkInstance.getAttendances();
            await zkInstance.disconnect();
            
            // Mark online since connection succeeded
            await prisma.biometricDevice.update({
                where: { id: deviceId },
                data: { connectionStatus: "online" }
            });
        } catch (connErr: any) {
            console.error("Device connection error:", connErr);
            // Mark offline since connection failed
            await prisma.biometricDevice.update({
                where: { id: deviceId },
                data: { connectionStatus: "offline" }
            });
            throw new Error(`Device offline or connection timed out: ${connErr.message}`);
        }

        let newLogsCount = 0;
        
        if (attendances && attendances.data) {
            console.log("=== RAW DEVICE ATTENDANCES ===");
            console.log(attendances.data.slice(0, 5)); // Log the first 5 records to prevent terminal flood
            console.log(`Total Records: ${attendances.data.length}`);
            console.log("==============================");
            
            newLogsCount = attendances.data.length;
            
            // Trigger actual sync logs in the background queue
            await syncBiometricLogs({
                vendor: device.vendor,
                rawData: attendances.data,
                syncedBy: session.user.id,
                deviceId,
            });
        }
        
        // Update device sync time
        await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: { lastSyncAt: new Date() }
        });

        return { success: true, count: newLogsCount };
    } catch (error: any) {
        const session = await auth();
        if (session?.user) {
            await prisma.biometricSyncLog.create({
                data: {
                    deviceId,
                    vendor: device?.vendor || "UNKNOWN",
                    status: "FAILED",
                    errorMessage: error.message || "Unknown error",
                    syncedBy: session.user.id
                }
            });
        }
        return { success: false, error: error.message };
    }
}
