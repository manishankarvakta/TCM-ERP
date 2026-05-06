/**
 * Backup Restore Functions
 * 
 * Functions for restoring database, files, and full backups with progress tracking.
 */

import { promises as fs } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { RestoreOptions } from '@/types/backup';
import {
  parsePostgresConfig,
  getMinIOConfig,
  METADATA_FILENAME,
  DATABASE_DUMP_FILENAME,
  FILES_DIRECTORY_NAME,
  TEMP_DIR,
} from './config';
import { extractMetadataFromZip } from './metadata';
import { validateBackupIntegrity } from './validate';
import { findBackupPath } from './list';
import { createDatabaseBackup, createFullBackup } from './create';
import { getRestoreManager } from './restore-manager';
import {
  ensureBackupDirectories,
  cleanupTempFiles,
  generateTempFilePath,
  formatBytes,
} from './utils';
import { storage } from '@/lib/storage';
import { createReadStream } from 'fs';

const execAsync = promisify(exec);

/**
 * Restore a database backup
 * @param backupId - Backup identifier
 * @param restoreId - Restore operation identifier for progress tracking
 * @param options - Restore options
 */
export async function restoreDatabaseBackup(
  backupId: string,
  restoreId: string,
  options?: RestoreOptions
): Promise<void> {
  const manager = getRestoreManager();

  try {
    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);

    // Validate integrity unless skipped
    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(backupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
      
      manager.addLog(restoreId, 'Backup validation passed');
    }

    const metadata = await extractMetadataFromZip(backupPath);
    manager.updateProgress(restoreId, { progress: 10 });

    // Stage 2: PREPARING (10-20%)
    manager.updateStatus(restoreId, 'PREPARING', 'Preparing for restore');
    
    if (options?.createPreRestoreBackup) {
      manager.addLog(restoreId, 'Creating pre-restore backup...');
      await createDatabaseBackup({ description: 'Pre-restore backup' });
      manager.addLog(restoreId, 'Pre-restore backup created');
    }
    
    manager.updateProgress(restoreId, { progress: 20 });

    // Stage 3: EXTRACTING (20-30%)
    manager.updateStatus(restoreId, 'EXTRACTING', 'Extracting database dump from backup');
    manager.addLog(restoreId, 'Extracting database.dump...');

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(backupPath, tempDumpPath);

    const dumpSize = await fs.stat(tempDumpPath);
    manager.addLog(restoreId, `Extracted database dump: ${formatBytes(dumpSize.size)}`);
    manager.updateProgress(restoreId, { progress: 30 });

    // Stage 4: RESTORING_DATABASE (30-90%)
    manager.updateStatus(restoreId, 'RESTORING_DATABASE', 'Restoring database');
    manager.addLog(restoreId, 'Starting database restore with pg_restore...');

    await executePgRestore(tempDumpPath, restoreId, options?.cleanDatabase);

    manager.addLog(restoreId, 'Database restore completed');
    manager.updateProgress(restoreId, { progress: 90 });

    // Stage 5: VERIFYING (90-95%)
    manager.updateStatus(restoreId, 'VERIFYING', 'Verifying restore');
    manager.addLog(restoreId, 'Verifying database restore...');
    // TODO: Add verification logic (count tables, records, etc.)
    manager.updateProgress(restoreId, { progress: 95 });

    // Stage 6: COMPLETED (100%)
    await cleanupTempFiles([tempDumpPath]);
    manager.completeRestore(restoreId);
  } catch (error) {
    manager.failRestore(
      restoreId,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    );
    throw error;
  }
}

/**
 * Restore a files backup
 * @param backupId - Backup identifier
 * @param restoreId - Restore operation identifier
 * @param options - Restore options
 */
export async function restoreFilesBackup(
  backupId: string,
  restoreId: string,
  options?: RestoreOptions
): Promise<void> {
  const manager = getRestoreManager();

  try {
    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);

    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(backupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const metadata = await extractMetadataFromZip(backupPath);
    manager.updateProgress(restoreId, { progress: 10 });

    // Stage 2: PREPARING (10-20%)
    manager.updateStatus(restoreId, 'PREPARING', 'Preparing for restore');
    
    if (options?.clearFiles) {
      manager.addLog(restoreId, 'Clearing existing files from local storage...');
      await clearLocalStorage();
      manager.addLog(restoreId, 'Local storage cleared');
    }
    
    manager.updateProgress(restoreId, { progress: 20 });

    // Stage 3: EXTRACTING (20-40%)
    manager.updateStatus(restoreId, 'EXTRACTING', 'Extracting files from backup');
    manager.addLog(restoreId, 'Extracting files from ZIP...');

    const tempExtractDir = generateTempFilePath('restore-files');
    await fs.mkdir(tempExtractDir, { recursive: true });

    const zip = new AdmZip(backupPath);
    const entries = zip.getEntries().filter(
      (entry) => !entry.isDirectory && entry.entryName !== METADATA_FILENAME
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);
    manager.updateProgress(restoreId, { 
      progress: 40,
      stats: { filesTotal: entries.length, filesUploaded: 0 }
    });

    // Stage 4: RESTORING_FILES (40-90%)
    manager.updateStatus(restoreId, 'RESTORING_FILES', 'Restoring files to local storage');
    
    const minioConfig = getMinIOConfig();
    let uploadedCount = 0;

    for (const entry of entries) {
      const fileContent = zip.readFile(entry);
      if (!fileContent) continue;

      // Save to local storage
      const key = entry.entryName;
      
      try {
        await storage.saveFile(key, fileContent);

        uploadedCount++;
        const progress = 40 + Math.floor((uploadedCount / entries.length) * 50);
        
        manager.updateProgress(restoreId, {
          progress,
          currentItem: key,
          stats: { filesUploaded: uploadedCount, filesTotal: entries.length },
        });

        if (uploadedCount % 10 === 0) {
          manager.addLog(restoreId, `Uploaded ${uploadedCount}/${entries.length} files`);
        }
      } catch (error) {
        manager.addLog(restoreId, `Failed to upload ${key}: ${error}`, 'warn');
      }
    }

    manager.addLog(restoreId, `Files restore completed: ${uploadedCount}/${entries.length} files`);
    manager.updateProgress(restoreId, { progress: 90 });

    // Stage 5: VERIFYING (90-95%)
    manager.updateStatus(restoreId, 'VERIFYING', 'Verifying restore');
    manager.addLog(restoreId, 'Verifying files restore...');
    manager.updateProgress(restoreId, { progress: 95 });

    // Cleanup
    await cleanupTempFiles([tempExtractDir]);
    manager.completeRestore(restoreId);
  } catch (error) {
    manager.failRestore(
      restoreId,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    );
    throw error;
  }
}

/**
 * Restore a full backup (database + files)
 * @param backupId - Backup identifier
 * @param restoreId - Restore operation identifier
 * @param options - Restore options
 */
export async function restoreFullBackup(
  backupId: string,
  restoreId: string,
  options?: RestoreOptions
): Promise<void> {
  const manager = getRestoreManager();

  try {
    // Stage 1: VALIDATING (0-5%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);

    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(backupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const metadata = await extractMetadataFromZip(backupPath);
    manager.updateProgress(restoreId, { progress: 5 });

    // Stage 2: PREPARING (5-10%)
    manager.updateStatus(restoreId, 'PREPARING', 'Preparing for restore');
    
    if (options?.createPreRestoreBackup) {
      manager.addLog(restoreId, 'Creating pre-restore backup...');
      await createFullBackup({ description: 'Pre-restore backup' });
      manager.addLog(restoreId, 'Pre-restore backup created');
    }
    
    manager.updateProgress(restoreId, { progress: 10 });

    // Stage 3: EXTRACTING (10-15%)
    manager.updateStatus(restoreId, 'EXTRACTING', 'Extracting backup contents');
    manager.addLog(restoreId, 'Extracting database and files...');

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(backupPath, tempDumpPath);

    manager.addLog(restoreId, 'Extraction completed');
    manager.updateProgress(restoreId, { progress: 15 });

    // Stage 4: RESTORING_DATABASE (15-55%)
    manager.updateStatus(restoreId, 'RESTORING_DATABASE', 'Restoring database');
    manager.addLog(restoreId, 'Starting database restore...');

    await executePgRestore(tempDumpPath, restoreId, options?.cleanDatabase, 15, 55);

    manager.addLog(restoreId, 'Database restore completed');
    manager.updateProgress(restoreId, { progress: 55 });

    // Stage 5: RESTORING_FILES (55-95%)
    manager.updateStatus(restoreId, 'RESTORING_FILES', 'Restoring files');
    manager.addLog(restoreId, 'Starting files restore...');

    if (options?.clearFiles) {
      manager.addLog(restoreId, 'Clearing existing files from local storage...');
      await clearLocalStorage();
    }

    const zip = new AdmZip(backupPath);
    const entries = zip.getEntries().filter(
      (entry) =>
        !entry.isDirectory &&
        entry.entryName !== METADATA_FILENAME &&
        entry.entryName !== DATABASE_DUMP_FILENAME &&
        entry.entryName.startsWith(FILES_DIRECTORY_NAME + '/')
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);

    const minioConfig = getMinIOConfig();
    let uploadedCount = 0;

    for (const entry of entries) {
      const fileContent = zip.readFile(entry);
      if (!fileContent) continue;

      // Remove files/ prefix
      const key = entry.entryName.substring(FILES_DIRECTORY_NAME.length + 1);
      
      try {
        await storage.saveFile(key, fileContent);

        uploadedCount++;
        const progress = 55 + Math.floor((uploadedCount / entries.length) * 40);
        
        manager.updateProgress(restoreId, {
          progress,
          currentItem: key,
          stats: { filesUploaded: uploadedCount, filesTotal: entries.length },
        });

        if (uploadedCount % 10 === 0) {
          manager.addLog(restoreId, `Uploaded ${uploadedCount}/${entries.length} files`);
        }
      } catch (error) {
        manager.addLog(restoreId, `Failed to upload ${key}: ${error}`, 'warn');
      }
    }

    manager.addLog(restoreId, `Files restore completed: ${uploadedCount}/${entries.length} files`);
    manager.updateProgress(restoreId, { progress: 95 });

    // Stage 6: VERIFYING (95-100%)
    manager.updateStatus(restoreId, 'VERIFYING', 'Verifying restore');
    manager.addLog(restoreId, 'Verifying full restore...');
    manager.updateProgress(restoreId, { progress: 100 });

    // Cleanup
    await cleanupTempFiles([tempDumpPath]);
    manager.completeRestore(restoreId);
  } catch (error) {
    manager.failRestore(
      restoreId,
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined
    );
    throw error;
  }
}

/**
 * Extract database dump from backup ZIP
 * @param backupPath - Path to backup ZIP
 * @param outputPath - Where to extract dump file
 */
async function extractDatabaseDump(backupPath: string, outputPath: string): Promise<void> {
  const zip = new AdmZip(backupPath);
  const dumpEntry = zip.getEntry(DATABASE_DUMP_FILENAME);

  if (!dumpEntry) {
    throw new Error('Database dump not found in backup');
  }

  const dumpContent = zip.readFile(dumpEntry);
  if (!dumpContent) {
    throw new Error('Failed to read database dump from backup');
  }

  await fs.writeFile(outputPath, dumpContent);
}

/**
 * Execute pg_restore to restore database
 * @param dumpPath - Path to dump file
 * @param restoreId - Restore ID for progress tracking
 * @param cleanDatabase - Whether to clean database before restore
 * @param progressStart - Starting progress percentage
 * @param progressEnd - Ending progress percentage
 */
async function executePgRestore(
  dumpPath: string,
  restoreId: string,
  cleanDatabase: boolean = true,
  progressStart: number = 30,
  progressEnd: number = 90
): Promise<void> {
  const config = parsePostgresConfig();
  const manager = getRestoreManager();

  // Build pg_restore command
  const args = [
    `-h ${config.host}`,
    `-p ${config.port}`,
    `-U ${config.user}`,
    `-d ${config.database}`,
    '--no-owner',
    '--no-acl',
  ];

  if (cleanDatabase) {
    args.push('--clean'); // Drop objects before recreating
  }

  args.push(dumpPath);

  const command = `pg_restore ${args.join(' ')}`;

  try {
    // Update progress as restore runs
    const progressRange = progressEnd - progressStart;
    const updateInterval = setInterval(() => {
      const current = manager.getProgress(restoreId);
      if (current && current.progress < progressEnd - 5) {
        manager.updateProgress(restoreId, {
          progress: Math.min(current.progress + 2, progressEnd - 5),
        });
      }
    }, 2000);

    await execAsync(command, {
      env: {
        ...process.env,
        PGPASSWORD: config.password,
      },
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer
    });

    clearInterval(updateInterval);
    manager.updateProgress(restoreId, { progress: progressEnd });
  } catch (error: any) {
    // Some pg_restore warnings are normal (e.g., objects already exist)
    // Only fail if it's a critical error
    if (error.message.includes('command not found') || error.code === 'ENOENT') {
      throw new Error('pg_restore command not found. Please install PostgreSQL client tools.');
    }

    if (error.message.includes('password authentication failed')) {
      throw new Error('Database authentication failed.');
    }

    // Log warning but don't fail
    manager.addLog(restoreId, `pg_restore warning: ${error.message}`, 'warn');
  }
}

/**
 * Clear all objects from local storage
 */
async function clearLocalStorage(): Promise<void> {
  try {
    const allObjects = await storage.listFiles("");
    if (allObjects && allObjects.length > 0) {
      for (const key of allObjects) {
        if (!key.endsWith("/")) {
          await storage.deleteFile(key);
        }
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to clear local storage: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

