import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settingsRecord = await prisma.settings.findFirst({
      where: {
        code: 'SYSTEM_BACKUP',
        category: 'BACKUP_SETTINGS',
      },
    });

    return NextResponse.json({ 
      settings: settingsRecord?.settings || {
        isAutoBackupEnabled: false,
        backupTime: "02:00",
        googleDriveFolderId: "",
        googleServiceAccountJson: "",
      } 
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch backup settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const existingRecord = await prisma.settings.findFirst({
      where: {
        code: 'SYSTEM_BACKUP',
        category: 'BACKUP_SETTINGS',
      },
    });

    if (existingRecord) {
      // Merge new settings with existing settings
      const mergedSettings = { ...(existingRecord.settings as any || {}), ...body };
      
      await prisma.settings.update({
        where: { id: existingRecord.id },
        data: { settings: mergedSettings, isActive: true },
      });
    } else {
      await prisma.settings.create({
        data: {
          title: 'System Backup Settings',
          code: 'SYSTEM_BACKUP',
          category: 'BACKUP_SETTINGS',
          settings: body,
          isActive: true,
          isGlobal: true,
          createdBy: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to save backup settings' },
      { status: 500 }
    );
  }
}
