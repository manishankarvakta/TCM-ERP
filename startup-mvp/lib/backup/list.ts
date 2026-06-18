/**
 * Backup Listing Functions
 * 
 * Functions for scanning and listing backups from filesystem.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { BackupListItem, BackupType, BackupStatus } from '@/types/backup';
import { getBackupTypeDir, extractBackupId, BACKUP_FILENAME_PATTERN } from './config';
import { extractMetadataFromZip, hasValidMetadata } from './metadata';
import { quickValidate, isCorrupted } from './validate';
import { getBackupTypeFromPath } from './utils';

/**
 * List all backups across all types
 * @returns Array of all backup items sorted by date (newest first)
 */
export async function listAllBackups(): Promise<BackupListItem[]> {
  const [databaseBackups, filesBackups, fullBackups] = await Promise.all([
    scanBackupDirectory('database'),
    scanBackupDirectory('files'),
    scanBackupDirectory('full'),
  ]);

  const allBackups = [...databaseBackups, ...filesBackups, ...fullBackups];

  // Sort by creation date (newest first)
  return sortBackupsByDate(allBackups);
}

/**
 * Scan a specific backup directory for backup files
 * @param type - Backup type to scan
 * @returns Array of backup items found in directory
 */
export async function scanBackupDirectory(type: BackupType): Promise<BackupListItem[]> {
  const dir = getBackupTypeDir(type);
  const backups: BackupListItem[] = [];

  try {
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Read all files in directory
    const files = await fs.readdir(dir);

    // Filter and process backup files
    for (const filename of files) {
      // Only process .zip or .encrypted files that match backup naming pattern
      if (!filename.endsWith('.zip') && !filename.endsWith('.encrypted')) {
        continue;
      }

      // Check if it looks like a backup file
      const backupId = extractBackupId(filename);
      if (!backupId && !BACKUP_FILENAME_PATTERN.test(filename)) {
        continue;
      }

      const filePath = path.join(dir, filename);

      try {
        // Get file stats
        const stats = await fs.stat(filePath);

        // Determine backup status
        const status = await determineBackupStatus(filePath);

        // Extract metadata (may fail for corrupted or legacy backups)
        let metadata;
        try {
          metadata = await extractMetadataFromZip(filePath);
        } catch (error) {
          // Fallback: Check for sidecar metadata (Legacy system)
          const { loadBackupMetadata } = await import("@/lib/backup-metadata");
          const legacyMeta = await loadBackupMetadata(filePath);
          
          if (legacyMeta) {
             metadata = {
               id: backupId || filename.replace('.zip', '').replace('.encrypted', ''),
               type: legacyMeta.type as any,
               timestamp: legacyMeta.createdAt,
               size: legacyMeta.originalSize || stats.size,
               encrypted: legacyMeta.encrypted,
               checksum: legacyMeta.checksum || '',
               version: '1.0',
               application: { name: 'legacy', version: '1.0' },
               compression: { algorithm: 'deflate', level: 6 },
             };
          } else {
            // If metadata extraction fails and no sidecar found, create a minimal backup item
            backups.push({
              metadata: {
                id: backupId || filename.replace('.zip', ''),
                type,
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
                encrypted: false,
                checksum: '',
                version: '1.0',
                application: { name: 'unknown', version: 'unknown' },
                compression: { algorithm: 'deflate', level: 6 },
              },
              filePath,
              fileName: filename,
              status: status === 'valid' ? 'valid' : 'corrupted',
              modifiedAt: stats.mtime,
              fileSize: stats.size,
            });
            continue;
          }
        }

        backups.push({
          metadata: metadata as any,
          filePath,
          fileName: filename,
          status,
          modifiedAt: stats.mtime,
          fileSize: stats.size,
        });
      } catch (error) {
        console.error(`Error processing backup file ${filename}:`, error);
        // Skip files that cause errors
      }
    }
  } catch (error) {
    console.error(`Error scanning backup directory ${type}:`, error);
    // Return empty array if directory cannot be read
  }

  return backups;
}

/**
 * Get details for a specific backup by ID
 * Searches all backup directories
 * @param backupId - Backup identifier
 * @returns Backup item or null if not found
 */
export async function getBackupDetails(backupId: string): Promise<BackupListItem | null> {
  // Search in all three directories
  const types: BackupType[] = ['database', 'files', 'full'];

  for (const type of types) {
    const dir = getBackupTypeDir(type);
    const filename = `${backupId}.zip`;
    const filePath = path.join(dir, filename);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      // Extract metadata
      const metadata = await extractMetadataFromZip(filePath);

      // Determine status
      const status = await determineBackupStatus(filePath);

      return {
        metadata,
        filePath,
        fileName: filename,
        status,
        modifiedAt: stats.mtime,
        fileSize: stats.size,
      };
    } catch (error) {
      // File not found in this directory, continue searching
      continue;
    }
  }

  return null;
}

/**
 * Delete a backup by ID
 * Searches all backup directories and deletes if found
 * @param backupId - Backup identifier
 * @returns True if backup was deleted, false if not found
 */
export async function deleteBackup(backupId: string): Promise<boolean> {
  const types: BackupType[] = ['database', 'files', 'full'];

  for (const type of types) {
    const dir = getBackupTypeDir(type);
    const filename = `${backupId}.zip`;
    const filePath = path.join(dir, filename);

    try {
      // Check if file exists
      await fs.access(filePath);

      // Delete the file
      await fs.unlink(filePath);

      console.log(`Deleted backup: ${backupId} (${type})`);
      return true;
    } catch (error) {
      // File not found in this directory, continue searching
      continue;
    }
  }

  return false;
}

/**
 * Determine the status of a backup file
 * @param filePath - Path to backup file
 * @returns Backup status
 */
async function determineBackupStatus(filePath: string): Promise<BackupStatus> {
  try {
    // Check if it's an encrypted legacy backup
    if (filePath.endsWith(".encrypted")) {
      const { loadBackupMetadata } = await import("@/lib/backup-metadata");
      const legacyMeta = await loadBackupMetadata(filePath);
      return legacyMeta ? "valid" : "corrupted";
    }

    // Check if file is corrupted (standard ZIP)
    if (await isCorrupted(filePath)) {
      console.warn(`[determineBackupStatus] ${filePath} is detected as corrupted`);
      return 'corrupted';
    }

    // Quick validation check
    const isValid = await quickValidate(filePath);
    if (isValid) {
      return 'valid';
    }

    // If it has sidecar metadata but failed internal validation, it's a valid legacy backup
    const { loadBackupMetadata } = await import("@/lib/backup-metadata");
    const legacyMeta = await loadBackupMetadata(filePath);
    if (legacyMeta) {
      return "valid";
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Sort backups by creation date (newest first)
 * @param backups - Array of backup items
 * @returns Sorted array
 */
export function sortBackupsByDate(backups: BackupListItem[]): BackupListItem[] {
  return backups.sort((a, b) => {
    const dateA = new Date(a.metadata.timestamp).getTime();
    const dateB = new Date(b.metadata.timestamp).getTime();
    return dateB - dateA; // Newest first
  });
}

/**
 * Filter backups by type
 * @param backups - Array of backup items
 * @param type - Backup type to filter by
 * @returns Filtered array
 */
export function filterBackupsByType(
  backups: BackupListItem[],
  type: BackupType
): BackupListItem[] {
  return backups.filter((backup) => backup.metadata.type === type);
}

/**
 * Filter backups by status
 * @param backups - Array of backup items
 * @param status - Status to filter by
 * @returns Filtered array
 */
export function filterBackupsByStatus(
  backups: BackupListItem[],
  status: BackupStatus
): BackupListItem[] {
  return backups.filter((backup) => backup.status === status);
}

/**
 * Get backup count by type
 * @returns Object with counts for each type
 */
export async function getBackupCounts(): Promise<{
  database: number;
  files: number;
  full: number;
  total: number;
}> {
  const allBackups = await listAllBackups();

  const counts = {
    database: filterBackupsByType(allBackups, 'database').length,
    files: filterBackupsByType(allBackups, 'files').length,
    full: filterBackupsByType(allBackups, 'full').length,
    total: allBackups.length,
  };

  return counts;
}

/**
 * Find backup file path by ID
 * @param backupId - Backup identifier
 * @returns File path or null if not found
 */
export async function findBackupPath(backupId: string): Promise<string | null> {
  const details = await getBackupDetails(backupId);
  return details ? details.filePath : null;
}

/**
 * Check if a backup exists
 * @param backupId - Backup identifier
 * @returns True if backup exists
 */
export async function backupExists(backupId: string): Promise<boolean> {
  const path = await findBackupPath(backupId);
  return path !== null;
}

