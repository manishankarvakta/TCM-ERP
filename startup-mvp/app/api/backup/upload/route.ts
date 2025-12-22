/**
 * POST /api/backup/upload
 * Upload a backup file
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { BackupErrorCode } from '@/types/backup';
import { extractMetadataFromZip, getBackupType } from '@/lib/backup/metadata';
import { validateBackupIntegrity } from '@/lib/backup/validate';
import { getBackupTypeDir, extractBackupId, BACKUP_CONSTRAINTS } from '@/lib/backup/config';
import { sanitizeFilename } from '@/lib/backup/utils';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'No file provided',
            code: BackupErrorCode.INVALID_INPUT,
            details: 'Please provide a backup file',
          },
        },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > BACKUP_CONSTRAINTS.maxUploadSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'File too large',
            code: BackupErrorCode.FILE_TOO_LARGE,
            details: `Maximum file size is ${Math.floor(BACKUP_CONSTRAINTS.maxUploadSize / (1024 * 1024 * 1024))}GB`,
          },
        },
        { status: 413 }
      );
    }

    // Check file extension
    const filename = sanitizeFilename(file.name);
    if (!filename.endsWith('.zip')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Invalid file type',
            code: BackupErrorCode.INVALID_BACKUP_FILE,
            details: 'Only ZIP files are accepted',
          },
        },
        { status: 400 }
      );
    }

    console.log(`[API] Uploading backup: ${filename} (${file.size} bytes)`);

    // Save to temporary location
    const tempDir = path.join(process.cwd(), 'tmp', 'uploads');
    await fs.mkdir(tempDir, { recursive: true });
    
    tempFilePath = path.join(tempDir, `upload-${Date.now()}-${filename}`);
    
    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(tempFilePath, buffer);

    console.log('[API] File saved to temp location, validating...');

    // Extract and validate metadata
    let metadata;
    try {
      metadata = await extractMetadataFromZip(tempFilePath);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Invalid backup file',
            code: BackupErrorCode.INVALID_BACKUP_FILE,
            details: 'Could not extract metadata from backup file',
          },
        },
        { status: 400 }
      );
    }

    // Validate backup integrity
    const validation = await validateBackupIntegrity(tempFilePath);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Backup validation failed',
            code: BackupErrorCode.VALIDATION_FAILED,
            details: validation.errors.join(', '),
          },
        },
        { status: 400 }
      );
    }

    // Determine final location based on backup type
    const backupType = metadata.type;
    const backupDir = getBackupTypeDir(backupType);
    await fs.mkdir(backupDir, { recursive: true });

    // Use the backup ID from metadata as filename
    const finalFilename = `${metadata.id}.zip`;
    const finalPath = path.join(backupDir, finalFilename);

    // Check if backup already exists
    try {
      await fs.access(finalPath);
      return NextResponse.json(
        {
          success: false,
          error: {
            error: 'Backup already exists',
            code: BackupErrorCode.INVALID_BACKUP_FILE,
            details: `A backup with ID ${metadata.id} already exists`,
          },
        },
        { status: 409 }
      );
    } catch {
      // File doesn't exist, which is what we want
    }

    // Move to final location
    await fs.rename(tempFilePath, finalPath);
    tempFilePath = null; // Don't delete in cleanup since it's been moved

    console.log(`[API] Backup uploaded successfully: ${finalFilename}`);

    return NextResponse.json(
      {
        success: true,
        data: {
          metadata,
          filePath: finalPath,
          message: 'Backup uploaded successfully',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Backup upload failed:', error);

    // Cleanup temp file on error
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          error: 'Failed to upload backup',
          code: BackupErrorCode.UPLOAD_FAILED,
          details: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

