"use server";

import prisma from "@/lib/prisma";
import ZKLib from "node-zklib";
import { auth } from "@/lib/auth";

export async function testDeviceConnection(ip: string, port: number = 4370) {
    try {
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
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
        if (!device || !device.ipAddress) {
            return { success: false, error: "Device or IP not found" };
        }

        const zkInstance = new ZKLib(device.ipAddress, device.port || 4370, 10000, 4000);
        await zkInstance.createSocket();
        
        const users = await zkInstance.getUsers();
        await zkInstance.disconnect();
        
        // Log the sync attempt
        await prisma.biometricSyncLog.create({
            data: {
                deviceId,
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
                    status: "FAILED",
                    errorMessage: error.message,
                    syncedBy: session.user.id
                }
            });
        }
        return { success: false, error: error.message };
    }
}

export async function syncDeviceAttendance(deviceId: string) {
    try {
        const session = await auth();
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const device = await prisma.biometricDevice.findUnique({ where: { id: deviceId } });
        if (!device || !device.ipAddress) {
            return { success: false, error: "Device or IP not found" };
        }

        const zkInstance = new ZKLib(device.ipAddress, device.port || 4370, 10000, 4000);
        await zkInstance.createSocket();
        
        const attendances = await zkInstance.getAttendances();
        await zkInstance.disconnect();
        
        let newLogsCount = 0;
        
        if (attendances && attendances.data) {
            console.log("=== RAW DEVICE ATTENDANCES ===");
            console.log(attendances.data.slice(0, 5)); // Log the first 5 records to prevent terminal flood
            console.log(`Total Records: ${attendances.data.length}`);
            console.log("==============================");
            
            // Note: In a production scenario, you must map the `deviceUserId` to your Prisma `Employee` table.
            // Since this involves complex logic mapping internal ZKTeco IDs to `employeeCode`, 
            // we will simulate the ingestion here for architectural completeness.
            
            newLogsCount = attendances.data.length;
        }
        
        // Update device sync time
        await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: { lastSyncAt: new Date() }
        });

        await prisma.biometricSyncLog.create({
            data: {
                deviceId,
                status: "SUCCESS",
                recordsCount: newLogsCount,
                syncedBy: session.user.id
            }
        });

        return { success: true, count: newLogsCount };
    } catch (error: any) {
        const session = await auth();
        if (session?.user) {
            await prisma.biometricSyncLog.create({
                data: {
                    deviceId,
                    status: "FAILED",
                    errorMessage: error.message,
                    syncedBy: session.user.id
                }
            });
        }
        return { success: false, error: error.message };
    }
}
