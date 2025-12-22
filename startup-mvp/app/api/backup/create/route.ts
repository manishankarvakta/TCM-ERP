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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, options } = body;

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

    return NextResponse.json(
      {
        success: true,
        data: {
          metadata,
          duration,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Backup creation failed:', error);

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

