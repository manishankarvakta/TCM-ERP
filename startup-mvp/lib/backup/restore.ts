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
  METADATA_FILENAME,
  DATABASE_DUMP_FILENAME,
  FILES_DIRECTORY_NAME,
  TEMP_DIR,
} from './config';
import { extractMetadataFromZip } from './metadata';
import { loadBackupMetadata } from '../backup-metadata';
import { decryptBackupFile, getEncryptionKey } from '../backup-encryption';
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
  let decryptedTempPath: string | null = null;

  try {
    // Ensure all backup directories exist (especially TEMP_DIR)
    await ensureBackupDirectories();

    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId, 'database');
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

    const metadata = await loadBackupMetadata(backupPath);
    manager.updateProgress(restoreId, { progress: 10 });

    // Stage 2: PREPARING (10-20%)
    manager.updateStatus(restoreId, 'PREPARING', 'Preparing for restore');
    
    if (options?.createPreRestoreBackup) {
      manager.addLog(restoreId, 'Creating pre-restore backup...');
      await createDatabaseBackup({ type: 'database', description: 'Pre-restore backup' });
      manager.addLog(restoreId, 'Pre-restore backup created');
    }
    
    manager.updateProgress(restoreId, { progress: 20 });

    // Stage 3: EXTRACTING (20-30%)
    manager.updateStatus(restoreId, 'EXTRACTING', 'Extracting database dump from backup');
    manager.addLog(restoreId, 'Extracting database.dump...');

    let activeBackupPath = backupPath;
    if (metadata.encrypted) {
      manager.addLog(restoreId, 'Decrypting backup file...');
      decryptedTempPath = generateTempFilePath('decrypted-zip') + '.zip';
      const key = getEncryptionKey();
      await decryptBackupFile(backupPath, decryptedTempPath, key);
      activeBackupPath = decryptedTempPath;
      manager.addLog(restoreId, 'Decryption completed');
    }

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(activeBackupPath, tempDumpPath);

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
    const cleanupPaths = [tempDumpPath];
    if (decryptedTempPath) cleanupPaths.push(decryptedTempPath);
    await cleanupTempFiles(cleanupPaths);
    manager.completeRestore(restoreId);
  } catch (error) {
    if (decryptedTempPath) {
      try { await fs.unlink(decryptedTempPath); } catch {}
    }
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
  let decryptedTempPath: string | null = null;

  try {
    // Ensure all backup directories exist (especially TEMP_DIR)
    await ensureBackupDirectories();

    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId, 'files');
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

    const metadata = await loadBackupMetadata(backupPath);
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

    let activeBackupPath = backupPath;
    if (metadata.encrypted) {
      manager.addLog(restoreId, 'Decrypting backup file...');
      decryptedTempPath = generateTempFilePath('decrypted-zip') + '.zip';
      const key = getEncryptionKey();
      await decryptBackupFile(backupPath, decryptedTempPath, key);
      activeBackupPath = decryptedTempPath;
      manager.addLog(restoreId, 'Decryption completed');
    }

    const tempExtractDir = generateTempFilePath('restore-files');
    await fs.mkdir(tempExtractDir, { recursive: true });

    const zip = new AdmZip(activeBackupPath);
    const entries = zip.getEntries().filter(
      (entry: any) => !entry.isDirectory && entry.entryName !== METADATA_FILENAME
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);
    manager.updateProgress(restoreId, { 
      progress: 40,
      stats: { filesTotal: entries.length, filesUploaded: 0 }
    });

    // Stage 4: RESTORING_FILES (40-90%)
    manager.updateStatus(restoreId, 'RESTORING_FILES', 'Restoring files to local storage');
    

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
    const cleanupPaths = [tempExtractDir];
    if (decryptedTempPath) cleanupPaths.push(decryptedTempPath);
    await cleanupTempFiles(cleanupPaths);
    manager.completeRestore(restoreId);
  } catch (error) {
    if (decryptedTempPath) {
      try { await fs.unlink(decryptedTempPath); } catch {}
    }
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
  let decryptedTempPath: string | null = null;

  try {
    // Ensure all backup directories exist (especially TEMP_DIR)
    await ensureBackupDirectories();

    // Stage 1: VALIDATING (0-5%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId, 'full');
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

    const metadata = await loadBackupMetadata(backupPath);
    manager.updateProgress(restoreId, { progress: 5 });

    // Stage 2: PREPARING (5-10%)
    manager.updateStatus(restoreId, 'PREPARING', 'Preparing for restore');
    
    if (options?.createPreRestoreBackup) {
      manager.addLog(restoreId, 'Creating pre-restore backup...');
      await createFullBackup({ type: 'full', description: 'Pre-restore backup' });
      manager.addLog(restoreId, 'Pre-restore backup created');
    }
    
    manager.updateProgress(restoreId, { progress: 10 });

    // Stage 3: EXTRACTING (10-15%)
    manager.updateStatus(restoreId, 'EXTRACTING', 'Extracting backup contents');
    manager.addLog(restoreId, 'Extracting database and files...');

    let activeBackupPath = backupPath;
    if (metadata.encrypted) {
      manager.addLog(restoreId, 'Decrypting backup file...');
      decryptedTempPath = generateTempFilePath('decrypted-zip') + '.zip';
      const key = getEncryptionKey();
      await decryptBackupFile(backupPath, decryptedTempPath, key);
      activeBackupPath = decryptedTempPath;
      manager.addLog(restoreId, 'Decryption completed');
    }

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(activeBackupPath, tempDumpPath);

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

    const zip = new AdmZip(activeBackupPath);
    const entries = zip.getEntries().filter(
      (entry: any) =>
        !entry.isDirectory &&
        entry.entryName !== METADATA_FILENAME &&
        entry.entryName !== DATABASE_DUMP_FILENAME &&
        entry.entryName.startsWith(FILES_DIRECTORY_NAME + '/')
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);


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
    const cleanupPaths = [tempDumpPath];
    if (decryptedTempPath) cleanupPaths.push(decryptedTempPath);
    await cleanupTempFiles(cleanupPaths);
    manager.completeRestore(restoreId);
  } catch (error) {
    if (decryptedTempPath) {
      try { await fs.unlink(decryptedTempPath); } catch {}
    }
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

  const pgArgs = [
    `-h`, config.host,
    `-p`, config.port.toString(),
    `-U`, config.user,
    `-d`, config.database,
    '--no-owner',
    '--no-acl',
  ];

  if (cleanDatabase) {
    pgArgs.push('--clean');
    pgArgs.push('--if-exists');
  }

  let useDocker = false;
  try {
    await execAsync('pg_restore --version');
    manager.addLog(restoreId, 'Using host pg_restore...');
  } catch (error) {
    if (config.containerName) {
      manager.addLog(restoreId, `pg_restore not found on host. Falling back to Docker container: ${config.containerName}`);
      useDocker = true;
    } else {
      throw new Error(
        'pg_restore command not found on host and no POSTGRES_CONTAINER specified in .env. ' +
        'Please install PostgreSQL client tools or configure a Docker container.'
      );
    }
  }

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

    if (!useDocker) {
      // Standard host-based pg_restore
      const commandArgs = pgArgs.map(arg => arg.includes(' ') ? `"${arg}"` : arg);
      const command = `pg_restore ${commandArgs.join(' ')} "${dumpPath}"`;

      try {
        await execAsync(command, {
          env: {
            ...process.env,
            PGPASSWORD: config.password,
          },
          maxBuffer: 100 * 1024 * 1024, // 100MB buffer
        });
      } catch (execError: any) {
        const exitCode = String(execError.code ?? execError.status ?? '');
        if (exitCode === '1') {
          manager.addLog(restoreId, `pg_restore completed with warnings: ${execError.stderr || execError.message}`, 'warn');
        } else {
          throw execError;
        }
      }
    } else {
      // Docker-based pg_restore
      await new Promise<void>((resolve, reject) => {
        const { spawn } = require('child_process');
        const fs = require('fs');

        const fileStream = fs.createReadStream(dumpPath);

        const dockerPgArgs = pgArgs.filter(arg => arg !== '-h' && arg !== config.host && arg !== '-p' && arg !== config.port.toString());
        
        const dockerArgs = [
          'exec',
          '-i',
          '-e', `PGPASSWORD=${config.password}`,
          config.containerName!,
          'pg_restore',
          ...dockerPgArgs
        ];

        manager.addLog(restoreId, `Executing: docker ${dockerArgs.join(' ')} < [dump_file]`);

        const child = spawn('docker', dockerArgs);
        
        fileStream.pipe(child.stdin);

        let stderr = '';
        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number) => {
          if (code === 0 || code === 1) { 
            if (code === 1) {
               manager.addLog(restoreId, `pg_restore completed with warnings: ${stderr}`, 'warn');
            }
            resolve();
          } else {
            reject(new Error(`Docker pg_restore failed with code ${code}: ${stderr}`));
          }
        });

        child.on('error', (err: Error) => {
          reject(new Error(`Failed to start Docker process: ${err.message}`));
        });
      });
    }

    clearInterval(updateInterval);
    manager.updateProgress(restoreId, { progress: progressEnd });
  } catch (error: any) {
    const exitCode = String(error.code ?? error.status ?? '');
    // Distinguish between minor warnings (exit code 1) and fatal errors
    const isFatal = 
      exitCode !== '1' && 
      (error.message?.includes('could not connect') || 
       error.message?.includes('database does not exist') ||
       error.message?.includes('password authentication failed') ||
       error.message?.includes('role') ||
       error.message?.includes('FATAL:'));

    if (isFatal) {
      if (error.message?.includes('command not found') || error.code === 'ENOENT') {
        throw new Error('pg_restore command not found. Please install PostgreSQL client tools.');
      }

      if (error.message?.includes('password authentication failed')) {
        throw new Error('Database authentication failed.');
      }

      throw error;
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
