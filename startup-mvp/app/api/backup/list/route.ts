/**
 * GET /api/backup/list
 * List all backups, optionally filtered by type
 */

import { NextRequest, NextResponse } from 'next/server';
import { BackupErrorCode, type BackupType } from '@/types/backup';
import { listAllBackups, filterBackupsByType, getBackupCounts } from '@/lib/backup/list';
import { isBackupType } from '@/types/backup';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get('type');

    // Get all backups
    let backups = await listAllBackups();

    // Filter by type if specified
    if (typeParam) {
      if (!isBackupType(typeParam)) {
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

      backups = filterBackupsByType(backups, typeParam as BackupType);
    }

    // Get counts
    const counts = await getBackupCounts();

    return NextResponse.json(
      {
        success: true,
        data: {
          backups,
          total: backups.length,
          byType: counts,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[API] Backup listing failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to list backups',
          code: BackupErrorCode.BACKUP_LISTING_FAILED,
          details: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

