import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        // Authenticate CRON request
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch raw logs from today that haven't been processed yet
        // In a real system, you would track which logs have been processed.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const rawLogs = await prisma.attendanceLog.findMany({
            where: {
                timestamp: {
                    gte: today
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        // 2. Group logs by employee ID
        const groupedLogs: Record<string, typeof rawLogs> = {};
        for (const log of rawLogs) {
            if (!groupedLogs[log.employeeId]) {
                groupedLogs[log.employeeId] = [];
            }
            groupedLogs[log.employeeId].push(log);
        }

        // 3. Process logs into Attendance records
        let processedCount = 0;

        for (const employeeId of Object.keys(groupedLogs)) {
            const logs = groupedLogs[employeeId];
            if (logs.length < 2) continue; // Need at least an IN and OUT punch

            const checkIn = logs[0].timestamp;
            const checkOut = logs[logs.length - 1].timestamp; // Last punch of the day

            // Calculate hours worked
            const diffMs = checkOut.getTime() - checkIn.getTime();
            const workHours = diffMs / (1000 * 60 * 60);

            // Upsert into Attendance table
            await prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId: employeeId,
                        date: today
                    }
                },
                update: {
                    checkIn,
                    checkOut,
                    workHours: Number(workHours.toFixed(2)),
                    status: "PRESENT",
                },
                create: {
                    employeeId,
                    date: today,
                    checkIn,
                    checkOut,
                    workHours: Number(workHours.toFixed(2)),
                    status: "PRESENT",
                }
            });

            processedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Processed attendance for ${processedCount} employees today.`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
