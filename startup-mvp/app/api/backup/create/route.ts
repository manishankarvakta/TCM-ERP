/**
 * POST /api/backup/create
 * Create a new backup (database, files, or full)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BackupErrorCode, type BackupType } from '@/types/backup';
import {
  createDatabaseBackup,
  createFilesBackup,
  createFullBackup,
} from '@/lib/backup/create';
import { isBackupType } from '@/types/backup';
import { syncBackupToDrive, sendBackupTelegramNotification } from '@/lib/backup/integration-service';
import { prisma } from '@/lib/prisma';
import { getBackupTypeDir } from '@/lib/backup/config';
import { formatBytes } from '@/lib/backup/utils';
import { format } from 'date-fns';
import path from 'path';

export async function POST(request: NextRequest) {
  let requestType: string = 'Full';
  try {
    const body = await request.json();
    const { type, options } = body;
    requestType = type || 'Full';

    // Validate backup type
    if (!type || !isBackupType(type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Invalid backup type',
            code: BackupErrorCode.INVALID_INPUT,
            details: 'Type must be one of: database, files, full',
          },
        },
        { status: 400 }
      );
    }

    console.log(`[API] Creating ${type} backup...`);
    const startTime = Date.now();

    // Create backup based on type
    let metadata;
    switch (type as BackupType) {
      case 'database':
        metadata = await createDatabaseBackup(options);
        break;
      case 'files':
        metadata = await createFilesBackup(options);
        break;
      case 'full':
        metadata = await createFullBackup(options);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`[API] Backup created successfully in ${duration}ms`);

    // Integration uploads & notifications
    const filename = `${metadata.id}.zip`;
    const dir = getBackupTypeDir(metadata.type);
    const filePath = path.join(dir, filename);
    const sizeStr = formatBytes(metadata.size);

    // Check if syncToDrive is enabled in settings or in options
    const scheduleSetting = await prisma.settings.findFirst({
      where: { category: "backup", code: "backup_schedule", is_active: true }
    });
    const settings = scheduleSetting?.settings as any;
    const shouldSync = options?.syncToDrive !== undefined ? options.syncToDrive : (settings?.syncToDrive || false);

    let driveFileId = null;
    if (shouldSync) {
      driveFileId = await syncBackupToDrive(filePath, filename);
    }

    // Telegram Notification
    await sendBackupTelegramNotification(true, type, filename, sizeStr, driveFileId);

    return NextResponse.json(
      {
        success: true,
        data: {
          metadata,
          duration,
          driveFileId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Backup creation failed:', error);

    // Send Telegram Notification on failure
    const errorFilename = `backup-${format(new Date(), "yyyyMMdd-HHmmss")}.zip`;
    await sendBackupTelegramNotification(
      false,
      requestType,
      errorFilename,
      "0 B",
      null,
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to create backup',
          code: BackupErrorCode.BACKUP_CREATION_FAILED,
          details: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

