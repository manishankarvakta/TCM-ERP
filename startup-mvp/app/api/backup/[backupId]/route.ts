/**
 * GET /api/backup/[backupId]
 * Get details for a specific backup
 * 
 * DELETE /api/backup/[backupId]
 * Delete a specific backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { BackupErrorCode } from '@/types/backup';
import { getBackupDetails, deleteBackup } from '@/lib/backup/list';
import { isValidBackupId } from '@/lib/backup/config';

interface RouteContext {
  params: Promise<{
    backupId: string;
  }>;
}

/**
 * GET - Get backup details
 */
export async function GET(
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
            details: 'Backup ID must be in format: backup-YYYYMMDD-HHMMSS',
          },
        },
        { status: 400 }
      );
    }

    // Get backup details
    const backup = await getBackupDetails(backupId);

    if (!backup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Backup not found',
            code: BackupErrorCode.BACKUP_NOT_FOUND,
            details: `No backup found with ID: ${backupId}`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error('[API] Failed to get backup details:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to get backup details',
          code: BackupErrorCode.UNKNOWN_ERROR,
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete backup
 */
export async function DELETE(
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

    // Delete backup
    const deleted = await deleteBackup(backupId);

    if (!deleted) {
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

    return NextResponse.json(
      {
        success: true,
        data: { deleted: true },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Failed to delete backup:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to delete backup',
          code: BackupErrorCode.UNKNOWN_ERROR,
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

