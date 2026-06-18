/**
 * GET /api/backup/[backupId]/download
 * Download a backup file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import { BackupErrorCode } from '@/types/backup';
import { findBackupPath } from '@/lib/backup/list';
import { isValidBackupId } from '@/lib/backup/config';

interface RouteContext {
  params: Promise<{
    backupId: string;
  }>;
}

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
          },
        },
        { status: 400 }
      );
    }

    // Find backup file path
    const backupPath = await findBackupPath(backupId);

    if (!backupPath) {
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

    // Get file stats
    const stats = statSync(backupPath);
    const filename = `${backupId}.zip`;

    // Create read stream
    const stream = createReadStream(backupPath);

    // Convert Node.js stream to Web Stream
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: any) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        stream.on('end', () => {
          controller.close();
        });

        stream.on('error', (error) => {
          controller.error(error);
        });
      },
      cancel() {
        stream.destroy();
      },
    });

    // Return streaming response
    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[API] Failed to download backup:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to download backup',
          code: BackupErrorCode.UNKNOWN_ERROR,
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

