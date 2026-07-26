import { NextResponse } from "next/server";
import { processBiometricAttendance } from "@/lib/hr/biometric/processor";

export async function GET(request: Request) {
    try {
        // Authenticate CRON request
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        const result = await processBiometricAttendance(today, today);

        if (!result.success) {
            return NextResponse.json({ error: result.error || "Failed to process attendance" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Processed biometric attendance logs for today: ${result.processedCount} records updated.`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
