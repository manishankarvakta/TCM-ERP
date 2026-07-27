import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initBackupScheduler } from "@/lib/backup/scheduler";

export async function GET() {
  try {
    let setting = await prisma.settings.findFirst({
      where: { category: "backup", code: "backup_schedule", is_active: true }
    });

    if (!setting) {
      setting = await prisma.settings.create({
        data: {
          id: `backup-schedule-${Date.now()}`,
          title: "Backup Schedule Settings",
          code: "backup_schedule",
          category: "backup",
          settings: {
            autoBackup: false,
            frequency: "Day",
            time: "02:00",
            backupType: "Full",
            syncToDrive: false,
          },
          is_active: true,
          is_global: true,
        }
      });
    }

    return NextResponse.json(setting.settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Find existing
    let setting = await prisma.settings.findFirst({
      where: { category: "backup", code: "backup_schedule", is_active: true }
    });

    if (setting) {
      setting = await prisma.settings.update({
        where: { id: setting.id },
        data: {
          settings: body
        }
      });
    } else {
      setting = await prisma.settings.create({
        data: {
          id: `backup-schedule-${Date.now()}`,
          title: "Backup Schedule Settings",
          code: "backup_schedule",
          category: "backup",
          settings: body,
          is_active: true,
          is_global: true,
        }
      });
    }

    // Reactively reinitialize the scheduler
    await initBackupScheduler();

    return NextResponse.json(setting.settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
