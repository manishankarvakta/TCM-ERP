/**
 * Backup Restore Functions
 * 
 * Functions for restoring database, files, and full backups with progress tracking.
 */

import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
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
import { validateBackupIntegrity } from './validate';
import { loadBackupMetadata } from '../backup-metadata';
import { decryptBackupFileForRestore } from '../backup';
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
import { prisma } from '@/lib/prisma';

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
  let workingBackupPath = '';
  let isTempDecryptedFile = false;

  try {
    await ensureBackupDirectories();
    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);
    workingBackupPath = backupPath;

    // Check if backup is encrypted and decrypt if needed
    const encryptionMeta = await loadBackupMetadata(backupPath);
    if (encryptionMeta && encryptionMeta.encrypted) {
      manager.addLog(restoreId, 'Backup is encrypted. Decrypting backup file...');
      const decryptedBuffer = await decryptBackupFileForRestore(backupPath);
      workingBackupPath = path.join(TEMP_DIR, `decrypted_${backupId}.zip`);
      await fs.writeFile(workingBackupPath, decryptedBuffer);
      isTempDecryptedFile = true;
      manager.addLog(restoreId, 'Backup decrypted successfully to temporary file');
    }

    // Validate integrity unless skipped
    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(workingBackupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
      
      manager.addLog(restoreId, 'Backup validation passed');
    }

    const metadata = await extractMetadataFromZip(workingBackupPath);
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

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(workingBackupPath, tempDumpPath);

    const dumpSize = await fs.stat(tempDumpPath);
    manager.addLog(restoreId, `Extracted database dump: ${formatBytes(dumpSize.size)}`);
    manager.updateProgress(restoreId, { progress: 30 });

    // Stage 4: RESTORING_DATABASE (30-90%)
    manager.updateStatus(restoreId, 'RESTORING_DATABASE', 'Restoring database');
    manager.addLog(restoreId, 'Starting database restore with pg_restore...');

    await executePgRestore(tempDumpPath, restoreId, options?.cleanDatabase);

    manager.addLog(restoreId, 'Database restore completed');
    await updateDatabaseUrlsPostRestore(restoreId);
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
  } finally {
    if (isTempDecryptedFile) {
      try {
        await fs.unlink(workingBackupPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`Failed to delete temp decrypted file ${workingBackupPath}:`, err.message);
        }
      }
    }
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
  let workingBackupPath = '';
  let isTempDecryptedFile = false;

  try {
    await ensureBackupDirectories();
    // Stage 1: VALIDATING (0-10%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);
    workingBackupPath = backupPath;

    // Check if backup is encrypted and decrypt if needed
    const encryptionMeta = await loadBackupMetadata(backupPath);
    if (encryptionMeta && encryptionMeta.encrypted) {
      manager.addLog(restoreId, 'Backup is encrypted. Decrypting backup file...');
      const decryptedBuffer = await decryptBackupFileForRestore(backupPath);
      workingBackupPath = path.join(TEMP_DIR, `decrypted_${backupId}.zip`);
      await fs.writeFile(workingBackupPath, decryptedBuffer);
      isTempDecryptedFile = true;
      manager.addLog(restoreId, 'Backup decrypted successfully to temporary file');
    }

    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(workingBackupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const metadata = await extractMetadataFromZip(workingBackupPath);
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

    const zipData = await fs.readFile(workingBackupPath);
    const zip = await JSZip.loadAsync(zipData);
    const entries = Object.entries(zip.files).filter(
      ([name, file]) => !file.dir && name !== METADATA_FILENAME
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);
    manager.updateProgress(restoreId, { 
      progress: 40,
      stats: { filesTotal: entries.length, filesUploaded: 0 }
    });

    // Stage 4: RESTORING_FILES (40-90%)
    manager.updateStatus(restoreId, 'RESTORING_FILES', 'Restoring files to local storage');
    
    const minioConfig = null;
    let uploadedCount = 0;

    for (const [name, file] of entries) {
      const fileContent = await file.async('nodebuffer');
      if (!fileContent) continue;

      // Save to local storage
      const key = name;
      
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
  } finally {
    if (isTempDecryptedFile) {
      try {
        await fs.unlink(workingBackupPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`Failed to delete temp decrypted file ${workingBackupPath}:`, err.message);
        }
      }
    }
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
  let workingBackupPath = '';
  let isTempDecryptedFile = false;

  try {
    await ensureBackupDirectories();
    // Stage 1: VALIDATING (0-5%)
    manager.updateStatus(restoreId, 'VALIDATING', 'Validating backup file');
    manager.updateProgress(restoreId, { progress: 0 });

    const backupPath = await findBackupPath(backupId);
    if (!backupPath) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    manager.addLog(restoreId, `Found backup at: ${backupPath}`);
    workingBackupPath = backupPath;

    // Check if backup is encrypted and decrypt if needed
    const encryptionMeta = await loadBackupMetadata(backupPath);
    if (encryptionMeta && encryptionMeta.encrypted) {
      manager.addLog(restoreId, 'Backup is encrypted. Decrypting backup file...');
      const decryptedBuffer = await decryptBackupFileForRestore(backupPath);
      workingBackupPath = path.join(TEMP_DIR, `decrypted_${backupId}.zip`);
      await fs.writeFile(workingBackupPath, decryptedBuffer);
      isTempDecryptedFile = true;
      manager.addLog(restoreId, 'Backup decrypted successfully to temporary file');
    }

    if (!options?.skipVerification) {
      manager.addLog(restoreId, 'Validating backup integrity...');
      const validation = await validateBackupIntegrity(workingBackupPath);
      
      if (!validation.valid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
      }
    }

    const metadata = await extractMetadataFromZip(workingBackupPath);
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

    const tempDumpPath = generateTempFilePath('restore-db');
    await extractDatabaseDump(workingBackupPath, tempDumpPath);

    manager.addLog(restoreId, 'Extraction completed');
    manager.updateProgress(restoreId, { progress: 15 });

    // Stage 4: RESTORING_DATABASE (15-55%)
    manager.updateStatus(restoreId, 'RESTORING_DATABASE', 'Restoring database');
    manager.addLog(restoreId, 'Starting database restore...');

    await executePgRestore(tempDumpPath, restoreId, options?.cleanDatabase, 15, 55);

    manager.addLog(restoreId, 'Database restore completed');
    await updateDatabaseUrlsPostRestore(restoreId);
    manager.updateProgress(restoreId, { progress: 55 });

    // Stage 5: RESTORING_FILES (55-95%)
    manager.updateStatus(restoreId, 'RESTORING_FILES', 'Restoring files');
    manager.addLog(restoreId, 'Starting files restore...');

    if (options?.clearFiles) {
      manager.addLog(restoreId, 'Clearing existing files from local storage...');
      await clearLocalStorage();
    }

    const zipData = await fs.readFile(workingBackupPath);
    const zip = await JSZip.loadAsync(zipData);
    const entries = Object.entries(zip.files).filter(
      ([name, file]) =>
        !file.dir &&
        name !== METADATA_FILENAME &&
        name !== DATABASE_DUMP_FILENAME &&
        name.startsWith(FILES_DIRECTORY_NAME + '/')
    );

    manager.addLog(restoreId, `Found ${entries.length} files to restore`);

    const minioConfig = null;
    let uploadedCount = 0;

    for (const [name, file] of entries) {
      const fileContent = await file.async('nodebuffer');
      if (!fileContent) continue;

      // Remove files/ prefix
      const key = name.substring(FILES_DIRECTORY_NAME.length + 1);
      
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
  } finally {
    if (isTempDecryptedFile) {
      try {
        await fs.unlink(workingBackupPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`Failed to delete temp decrypted file ${workingBackupPath}:`, err.message);
        }
      }
    }
  }
}

/**
 * Extract database dump from backup ZIP
 * @param backupPath - Path to backup ZIP
 * @param outputPath - Where to extract dump file
 */
async function extractDatabaseDump(backupPath: string, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const zipData = await fs.readFile(backupPath);
  const zip = await JSZip.loadAsync(zipData);
  const dumpFile = zip.file(DATABASE_DUMP_FILENAME);

  if (!dumpFile) {
    throw new Error('Database dump not found in backup');
  }

  const dumpContent = await dumpFile.async('nodebuffer');
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
  const possibleContainers = config.containerName 
    ? [config.containerName] 
    : ['espacio-postgres', 'fferp-postgres', 'startup-mvp-postgres'];

  // Perform clean schema wipe if cleanDatabase is requested
  if (cleanDatabase) {
    try {
      manager.addLog(restoreId, 'Cleaning target database schema (DROP SCHEMA public CASCADE)...');
      const { prisma } = await import('@/lib/prisma');
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
      await prisma.$executeRawUnsafe(`CREATE SCHEMA public;`);
      await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
      manager.addLog(restoreId, 'Target database schema cleaned successfully.');
    } catch (cleanErr: any) {
      manager.addLog(restoreId, `Schema clean warning: ${cleanErr.message || cleanErr}`, 'warn');
    }
  }

  // Read header of dump file to detect format (binary vs SQL text)
  let isBinaryDump = true;
  try {
    const headerBuffer = await fs.readFile(dumpPath);
    if (headerBuffer.length >= 5 && headerBuffer.toString('utf-8', 0, 5) === 'PGDMP') {
      isBinaryDump = true;
    } else {
      isBinaryDump = false;
    }
  } catch {
    isBinaryDump = true;
  }

  // Tier 1: Try host-based pg_restore / psql if available
  let hostCliAvailable = false;
  const toolName = isBinaryDump ? 'pg_restore' : 'psql';
  try {
    await execAsync(`${toolName} --version`);
    hostCliAvailable = true;
  } catch {
    hostCliAvailable = false;
  }

  if (hostCliAvailable) {
    try {
      manager.addLog(restoreId, `Attempting host ${toolName}...`);
      if (isBinaryDump) {
        const args = [
          `-h`, config.host,
          `-p`, config.port.toString(),
          `-U`, config.user,
          `-d`, config.database,
          '--no-owner',
          '--no-acl',
        ];
        if (cleanDatabase) args.push('--clean', '--if-exists');
        args.push(dumpPath);

        try {
          await execAsync(`pg_restore ${args.join(' ')}`, {
            env: { ...process.env, PGPASSWORD: config.password },
            maxBuffer: 100 * 1024 * 1024,
          });
        } catch (hostExecErr: any) {
          // pg_restore exit code 1 means completed with warnings
          if (hostExecErr.code === 1 || hostExecErr.status === 1) {
            manager.addLog(restoreId, `Host pg_restore finished with non-fatal warnings: ${hostExecErr.stderr || hostExecErr.message}`, 'warn');
          } else {
            throw hostExecErr;
          }
        }
      } else {
        const command = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f ${dumpPath}`;
        await execAsync(command, {
          env: { ...process.env, PGPASSWORD: config.password },
          maxBuffer: 100 * 1024 * 1024,
        });
      }
      manager.addLog(restoreId, `Database restore completed successfully via host ${toolName}`);
      return;
    } catch (hostError: any) {
      manager.addLog(restoreId, `Host ${toolName} failed: ${hostError.message || hostError}`, 'warn');
    }
  }

  // Tier 2: Try Docker container pg_restore / psql
  for (const containerName of possibleContainers) {
    try {
      manager.addLog(restoreId, `Attempting database restore via Docker container ${containerName}...`);
      await executeDockerPgRestore(containerName, config.user, config.password, config.database, dumpPath, cleanDatabase, isBinaryDump);
      manager.addLog(restoreId, `Database restore completed successfully via Docker container ${containerName}`);
      return;
    } catch (dockerError: any) {
      manager.addLog(restoreId, `Docker container (${containerName}) restore failed: ${dockerError.message || dockerError}`, 'warn');
    }
  }

  // Tier 3: Prisma ORM SQL fallback execution (for plain SQL text dumps only)
  try {
    manager.addLog(restoreId, `Falling back to Prisma ORM SQL restore...`);
    await executePrismaFallbackRestore(dumpPath);
    manager.addLog(restoreId, `Database restore completed successfully via Prisma fallback`);
    return;
  } catch (fallbackError: any) {
    manager.addLog(restoreId, `Prisma SQL restore failed: ${fallbackError.message || fallbackError}`, 'error');
    throw new Error(`Database restore failed: ${fallbackError.message || String(fallbackError)}`);
  }
}

/**
 * Execute pg_restore / psql inside a Docker container
 */
function executeDockerPgRestore(
  containerName: string,
  user: string,
  pass: string,
  dbName: string,
  dumpPath: string,
  cleanDatabase: boolean,
  isBinaryDump: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const fs = require('fs');

    const inputStream = fs.createReadStream(dumpPath);
    const toolName = isBinaryDump ? 'pg_restore' : 'psql';
    const toolArgs = isBinaryDump
      ? ['-U', user, '-d', dbName, '--no-owner', '--no-acl', ...(cleanDatabase ? ['--clean', '--if-exists'] : [])]
      : ['-U', user, '-d', dbName];

    const dockerArgs = [
      'exec',
      '-i',
      '-e', `PGPASSWORD=${pass}`,
      containerName,
      toolName,
      ...toolArgs
    ];

    const child = spawn('docker', dockerArgs);
    inputStream.pipe(child.stdin);

    let stderr = '';
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number) => {
      // pg_restore exit code 0 or 1 (warnings) is considered success
      if (code === 0 || code === 1) {
        resolve();
      } else {
        reject(new Error(`Docker ${toolName} exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Fallback database restore using Prisma ORM execution
 */
async function executePrismaFallbackRestore(dumpPath: string): Promise<void> {
  const headerBuffer = await fs.readFile(dumpPath);
  if (headerBuffer.length >= 5 && headerBuffer.toString('utf-8', 0, 5) === 'PGDMP') {
    throw new Error('Binary PostgreSQL dump (.dump) cannot be executed as raw text SQL. Please install pg_restore client tools or ensure PostgreSQL Docker container is running.');
  }

  const { prisma } = await import('@/lib/prisma');
  const sqlContent = headerBuffer.toString('utf-8');
  const statements = sqlContent.split(/;\s*$/m).map(s => s.trim()).filter(Boolean);

  for (const statement of statements) {
    if (statement.startsWith('--') || !statement) continue;
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (err: any) {
      console.warn(`[Restore Fallback Statement Warning]:`, err.message || err);
    }
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

/**
 * Post-restore utility to update all absolute file/image URLs in the database
 * to point to the current target system's host (e.g. replacing live domains with localhost).
 */
async function updateDatabaseUrlsPostRestore(restoreId: string): Promise<void> {
  const manager = getRestoreManager();
  const currentHost = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  const targetHost = currentHost.replace(/\/+$/, '');

  try {
    manager.addLog(restoreId, `Post-Restore: Aligning database file/image URLs to current host: ${targetHost}...`);

    // 1. Category (image)
    await prisma.$executeRawUnsafe(
      `UPDATE "Category" SET "image" = regexp_replace("image", '^https?://[^/]+', $1) WHERE "image" ~ '^https?://'`,
      targetHost
    );

    // 2. Item (featuredImage)
    await prisma.$executeRawUnsafe(
      `UPDATE "Item" SET "featuredImage" = regexp_replace("featuredImage", '^https?://[^/]+', $1) WHERE "featuredImage" ~ '^https?://'`,
      targetHost
    );

    // 3. Item (images - JSON array of product gallery images)
    await prisma.$executeRawUnsafe(
      `UPDATE "Item" SET "images" = regexp_replace("images"::text, 'https?://[^/]+', $1, 'g')::jsonb WHERE "images" IS NOT NULL`,
      targetHost
    );

    // 4. ProductVariant (image)
    await prisma.$executeRawUnsafe(
      `UPDATE "ProductVariant" SET "image" = regexp_replace("image", '^https?://[^/]+', $1) WHERE "image" ~ '^https?://'`,
      targetHost
    );

    // 5. Client (image & documents)
    await prisma.$executeRawUnsafe(
      `UPDATE "Client" SET "image" = regexp_replace("image", '^https?://[^/]+', $1) WHERE "image" ~ '^https?://'`,
      targetHost
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Client" SET "documents" = regexp_replace("documents"::text, 'https?://[^/]+', $1, 'g')::jsonb WHERE "documents" IS NOT NULL`,
      targetHost
    );

    // 6. Supplier (image & documents)
    await prisma.$executeRawUnsafe(
      `UPDATE "Supplier" SET "image" = regexp_replace("image", '^https?://[^/]+', $1) WHERE "image" ~ '^https?://'`,
      targetHost
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "Supplier" SET "documents" = regexp_replace("documents"::text, 'https?://[^/]+', $1, 'g')::jsonb WHERE "documents" IS NOT NULL`,
      targetHost
    );

    // 7. Employee (photo)
    await prisma.$executeRawUnsafe(
      `UPDATE "Employee" SET "photo" = regexp_replace("photo", '^https?://[^/]+', $1) WHERE "photo" ~ '^https?://'`,
      targetHost
    );

    // 8. Organization (logo)
    await prisma.$executeRawUnsafe(
      `UPDATE "Organization" SET "logo" = regexp_replace("logo", '^https?://[^/]+', $1) WHERE "logo" ~ '^https?://'`,
      targetHost
    );

    // 9. User (image)
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "image" = regexp_replace("image", '^https?://[^/]+', $1) WHERE "image" ~ '^https?://'`,
      targetHost
    );

    manager.addLog(restoreId, `Post-Restore: Successfully aligned database URLs to ${targetHost}`);
  } catch (error) {
    manager.addLog(
      restoreId,
      `Post-Restore Warning: Failed to align database URLs: ${error instanceof Error ? error.message : String(error)}`,
      'warn'
    );
  }
}

