/**
 * POST /api/backup/[backupId]/restore
 * Start a restore operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { BackupErrorCode } from '@/types/backup';
import { getBackupDetails } from '@/lib/backup/list';
import { getRestoreManager } from '@/lib/backup/restore-manager';
import {
  restoreDatabaseBackup,
  restoreFilesBackup,
  restoreFullBackup,
} from '@/lib/backup/restore';
import { isValidBackupId } from '@/lib/backup/config';

interface RouteContext {
  params: Promise<{
    backupId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { backupId } = await context.params;

    // Validate backup ID format
    if (!isValidBackupId(backupId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Invalid backup ID format',
            code: BackupErrorCode.INVALID_INPUT,
          },
        },
        { status: 400 }
      );
    }

    // Check if backup exists
    const backup = await getBackupDetails(backupId);
    if (!backup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Backup not found',
            code: BackupErrorCode.BACKUP_NOT_FOUND,
          },
        },
        { status: 404 }
      );
    }

    // Check if a restore is already in progress
    const manager = getRestoreManager();
    if (manager.getActiveCount() > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'A restore operation is already in progress',
            code: BackupErrorCode.RESTORE_IN_PROGRESS,
            details: 'Please wait for the current restore to complete',
            retryable: true,
          },
        },
        { status: 409 }
      );
    }

    // Parse restore options from request body
    const body = await request.json().catch(() => ({}));
    const options = body.options || {};

    // Create restore operation
    const restoreId = manager.createRestore(backupId);

    console.log(`[API] Starting restore for backup ${backupId}, restore ID: ${restoreId}`);

    // Start restore asynchronously (don't await)
    // The restore function will update progress via the RestoreManager
    const restorePromise = (async () => {
      try {
        switch (backup.metadata.type) {
          case 'database':
            await restoreDatabaseBackup(backupId, restoreId, options);
            break;
          case 'files':
            await restoreFilesBackup(backupId, restoreId, options);
            break;
          case 'full':
            await restoreFullBackup(backupId, restoreId, options);
            break;
        }
      } catch (error) {
        // Error handling is done within the restore functions
        console.error(`[API] Restore ${restoreId} failed:`, error);
      }
    })();

    // Don't await the restore - return immediately with restore ID
    // Client can use the restore ID to track progress via SSE

    return NextResponse.json(
      {
        success: true,
        data: {
          restoreId,
          progressUrl: `/api/backup/restore/${restoreId}/progress`,
          message: 'Restore operation started',
        },
      },
      { status: 202 } // 202 Accepted
    );
  } catch (error) {
    console.error('[API] Failed to start restore:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to start restore operation',
          code: BackupErrorCode.RESTORE_FAILED,
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

