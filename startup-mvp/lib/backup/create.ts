/**
 * Backup Creation Functions
 * 
 * Core functions for creating database, files, and full backups.
 */

import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { BackupMetadata, BackupCreationOptions } from '@/types/backup';
import {
  getBackupTypeDir,
  parsePostgresConfig,
  generateBackupFilename,
  extractBackupId,
  METADATA_FILENAME,
  DATABASE_DUMP_FILENAME,
  FILES_DIRECTORY_NAME,
  TEMP_DIR,
  COMPRESSION_CONFIG,
} from './config';
import {
  createMetadata,
  updateMetadataChecksum,
  updateMetadataSize,
} from './metadata';
import {
  ensureBackupDirectories,
  calculateFileChecksum,
  getFileSize,
  cleanupTempFiles,
  generateTempFilePath,
  formatBytes,
} from './utils';
import { storage } from '@/lib/storage';

const execAsync = promisify(exec);

/**
 * Get database table information (names and record counts)
 * @returns Object with tables array and total record count
 */
async function getDatabaseTableInfo(): Promise<{ tables: string[], recordCount: number }> {
  const config = parsePostgresConfig();
  const { Client } = await import('pg');
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  try {
    await client.connect();
    
    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tables = tablesResult.rows.map((row: any) => row.tablename);
    
    // Get total record count (approximate for performance)
    let totalRecords = 0;
    for (const table of tables) {
      try {
        const countResult = await client.query(`
          SELECT COUNT(*) as count FROM "${table}"
        `);
        totalRecords += parseInt(countResult.rows[0].count);
      } catch (error) {
        // Skip tables we can't count
        console.warn(`Could not count records in table ${table}:`, error);
      }
    }
    
    return { tables, recordCount: totalRecords };
  } catch (error) {
    console.error('Failed to get database table info:', error);
    // Return empty data if query fails
    return { tables: [], recordCount: 0 };
  } finally {
    await client.end();
  }
}

/**
 * Create a database backup using pg_dump
 * @param options - Backup creation options
 * @returns Backup metadata
 */
export async function createDatabaseBackup(
  options?: BackupCreationOptions
): Promise<BackupMetadata> {
  console.log('[Backup] Starting database backup creation...');

  // Ensure directories exist
  await ensureBackupDirectories();

  const filename = generateBackupFilename();
  const backupId = extractBackupId(filename);
  if (!backupId) {
    throw new Error('Failed to extract backup ID from filename');
  }
  const finalPath = path.join(getBackupTypeDir('database'), filename);
  const tempDumpPath = generateTempFilePath('database');
  const tempZipPath = generateTempFilePath('zip');

  try {
    // Step 1: Create database dump with pg_dump
    console.log('[Backup] Creating database dump...');
    await executePgDump(tempDumpPath, options);

    const dumpSize = await getFileSize(tempDumpPath);
    console.log(`[Backup] Database dump created: ${formatBytes(dumpSize)}`);

    // Step 2: Get database table information
    console.log('[Backup] Querying database tables...');
    const { tables, recordCount } = await getDatabaseTableInfo();
    console.log(`[Backup] Found ${tables.length} tables with ${recordCount} total records`);

    // Step 3: Create ZIP archive with database dump and metadata
    console.log('[Backup] Creating ZIP archive...');
    
    // Get preliminary ZIP size (will be close to final)
    const tempZipPath2 = generateTempFilePath('zip-temp');
    await createZipArchive(tempZipPath2, async (archive) => {
      archive.file(tempDumpPath, { name: DATABASE_DUMP_FILENAME });
    });
    const preliminarySize = await getFileSize(tempZipPath2);
    await cleanupTempFiles([tempZipPath2]);
    
    // Create final metadata (checksum will be empty, size is estimate)
    const finalMetadata = createMetadata({
      id: backupId, // Use the same ID as the filename
      type: 'database',
      encrypted: options?.encrypt || false,
      description: options?.description,
      size: preliminarySize + 1024, // Add space for metadata
      checksum: '', // Leave empty - can't checksum a file that includes its own checksum
      database: {
        size: dumpSize,
        format: 'custom',
        tables: tables,
        recordCount: recordCount,
      },
    });

    await createZipArchive(tempZipPath, async (archive) => {
      // Add database dump
      archive.file(tempDumpPath, { name: DATABASE_DUMP_FILENAME });
      
      // Add metadata
      const metadataJson = JSON.stringify(finalMetadata, null, 2);
      archive.append(metadataJson, { name: METADATA_FILENAME });
    });

    // Step 4: Get final size
    const finalSize = await getFileSize(tempZipPath);
    finalMetadata.size = finalSize;

    // Step 5: Move to final location
    await fs.rename(tempZipPath, finalPath);

    // Cleanup temp files
    await cleanupTempFiles([tempDumpPath]);

    console.log(`[Backup] Database backup created successfully: ${filename}`);
    return finalMetadata;
  } catch (error) {
    // Cleanup on error
    await cleanupTempFiles([tempDumpPath, tempZipPath, finalPath]);
    throw new Error(
      `Database backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a files backup from MinIO
 * @param options - Backup creation options
 * @returns Backup metadata
 */
export async function createFilesBackup(
  options?: BackupCreationOptions
): Promise<BackupMetadata> {
  console.log('[Backup] Starting files backup creation...');

  await ensureBackupDirectories();

  const filename = generateBackupFilename();
  const backupId = extractBackupId(filename);
  if (!backupId) {
    throw new Error('Failed to extract backup ID from filename');
  }
  const finalPath = path.join(getBackupTypeDir('files'), filename);
  const tempZipPath = generateTempFilePath('zip');

  try {
    // Step 1: List all files in local storage
    console.log('[Backup] Listing files from local storage...');
    const objects = await storage.listFiles("");
    let totalSize = 0;

    console.log(`[Backup] Found ${objects.length} files in local storage`);

    await createZipArchive(tempZipPath, async (archive) => {
      // Add each file from local storage to ZIP
      for (const objectKey of objects) {
        if (objectKey.endsWith('/')) continue;
        try {
          const fileBuffer = await storage.readFile(objectKey);
          archive.append(fileBuffer, { name: objectKey });
          totalSize += fileBuffer.length;
        } catch (error) {
          console.warn(`Failed to backup file ${objectKey}:`, error);
          // Continue with other files
        }
      }
    });

    // Step 3: Get preliminary ZIP size
    console.log('[Backup] Getting preliminary size...');
    const preliminarySize = await getFileSize(tempZipPath);

    // Step 4: Create final metadata (checksum empty - can't checksum file containing its own checksum)
    const finalMetadata = createMetadata({
      id: backupId, // Use the same ID as the filename
      type: 'files',
      encrypted: options?.encrypt || false,
      description: options?.description,
      size: preliminarySize + 1024, // Add space for metadata
      checksum: '', // Leave empty
      files: {
        count: objects.length,
        totalSize: totalSize,
      },
    });

    // Step 5: Re-open ZIP and add metadata
    console.log('[Backup] Adding metadata to ZIP...');
    const zip = new AdmZip(tempZipPath);
    const metadataJson = JSON.stringify(finalMetadata, null, 2);
    zip.addFile(METADATA_FILENAME, Buffer.from(metadataJson, 'utf-8'));
    zip.writeZip(tempZipPath);

    // Update with final size
    const finalSize = await getFileSize(tempZipPath);
    finalMetadata.size = finalSize;

    // Step 6: Move to final location
    await fs.rename(tempZipPath, finalPath);

    console.log(`[Backup] Files backup created successfully: ${filename}`);
    console.log(`[Backup] Total size: ${formatBytes(finalSize)}, Files: ${objects.length}`);

    return finalMetadata;
  } catch (error) {
    await cleanupTempFiles([tempZipPath, finalPath]);
    throw new Error(
      `Files backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a full backup (database + files)
 * @param options - Backup creation options
 * @returns Backup metadata
 */
export async function createFullBackup(
  options?: BackupCreationOptions
): Promise<BackupMetadata> {
  console.log('[Backup] Starting full backup creation...');

  await ensureBackupDirectories();

  const filename = generateBackupFilename();
  const backupId = extractBackupId(filename);
  if (!backupId) {
    throw new Error('Failed to extract backup ID from filename');
  }
  const finalPath = path.join(getBackupTypeDir('full'), filename);
  const tempDumpPath = generateTempFilePath('database');
  const tempZipPath = generateTempFilePath('zip');

  try {
    // Step 1: Create database dump
    console.log('[Backup] Creating database dump...');
    await executePgDump(tempDumpPath, options);

    const dumpSize = await getFileSize(tempDumpPath);
    console.log(`[Backup] Database dump created: ${formatBytes(dumpSize)}`);

    // Step 2: Get database table information
    console.log('[Backup] Querying database tables...');
    const { tables, recordCount } = await getDatabaseTableInfo();
    console.log(`[Backup] Found ${tables.length} tables with ${recordCount} total records`);

    const objects = await storage.listFiles("");
    let filesSize = 0;

    console.log(`[Backup] Found ${objects.length} files in local storage`);

    await createZipArchive(tempZipPath, async (archive) => {
      // Add database dump
      archive.file(tempDumpPath, { name: DATABASE_DUMP_FILENAME });

      // Add files from local storage under files/ directory
      for (const objectKey of objects) {
        if (objectKey.endsWith('/')) continue;
        try {
          const fileBuffer = await storage.readFile(objectKey);
          // Add under files/ directory
          const zipPath = path.join(FILES_DIRECTORY_NAME, objectKey);
          archive.append(fileBuffer, { name: zipPath });
          filesSize += fileBuffer.length;
        } catch (error) {
          console.warn(`Failed to backup file ${objectKey}:`, error);
        }
      }
    });

    // Step 5: Get preliminary ZIP size
    console.log('[Backup] Getting preliminary size...');
    const preliminarySize = await getFileSize(tempZipPath);

    // Step 6: Create final metadata (checksum empty - can't checksum file containing its own checksum)
    const finalMetadata = createMetadata({
      id: backupId, // Use the same ID as the filename
      type: 'full',
      encrypted: options?.encrypt || false,
      description: options?.description,
      size: preliminarySize + 1024, // Add space for metadata
      checksum: '', // Leave empty
      database: {
        size: dumpSize,
        format: 'custom',
        tables: tables,
        recordCount: recordCount,
      },
      files: {
        count: objects.length,
        totalSize: filesSize,
      },
    });

    // Step 7: Re-open ZIP and add metadata
    console.log('[Backup] Adding metadata to ZIP...');
    const zip = new AdmZip(tempZipPath);
    const metadataJson = JSON.stringify(finalMetadata, null, 2);
    zip.addFile(METADATA_FILENAME, Buffer.from(metadataJson, 'utf-8'));
    zip.writeZip(tempZipPath);

    // Update with final size
    const finalSize = await getFileSize(tempZipPath);
    finalMetadata.size = finalSize;

    // Step 8: Move to final location
    await fs.rename(tempZipPath, finalPath);

    // Cleanup temp files
    await cleanupTempFiles([tempDumpPath]);

    console.log(`[Backup] Full backup created successfully: ${filename}`);
    console.log(`[Backup] Total size: ${formatBytes(finalSize)}`);
    console.log(`[Backup] Database: ${formatBytes(dumpSize)}, Files: ${objects.length} (${formatBytes(filesSize)})`);

    return finalMetadata;
  } catch (error) {
    await cleanupTempFiles([tempDumpPath, tempZipPath, finalPath]);
    throw new Error(
      `Full backup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Execute pg_dump to create database dump
 * @param outputPath - Path where dump file should be created
 * @param options - Backup options
 */
async function executePgDump(
  outputPath: string,
  options?: BackupCreationOptions
): Promise<void> {
  const config = parsePostgresConfig();

  // Build pg_dump command arguments
  // -Fc = custom format (compressed binary)
  const pgArgs = [
    `-h`, config.host,
    `-p`, config.port.toString(),
    `-U`, config.user,
    `-d`, config.database,
    '-Fc', // Custom format
    '--no-owner',
    '--no-acl',
  ];

  // Add table filters if specified
  if (options?.includeTables && options.includeTables.length > 0) {
    options.includeTables.forEach((table) => {
      pgArgs.push('-t', table);
    });
  }

  if (options?.excludeTables && options.excludeTables.length > 0) {
    options.excludeTables.forEach((table) => {
      pgArgs.push('-T', table);
    });
  }

  // Check if pg_dump is available on the host
  let useDocker = false;
  try {
    await execAsync('pg_dump --version');
    console.log('[Backup] Using host pg_dump...');
  } catch (error) {
    if (config.containerName) {
      console.log(`[Backup] pg_dump not found on host. Falling back to Docker container: ${config.containerName}`);
      useDocker = true;
    } else {
      throw new Error(
        'pg_dump command not found on host and no POSTGRES_CONTAINER specified in .env. ' +
        'Please install PostgreSQL client tools or configure a Docker container.'
      );
    }
  }

  if (!useDocker) {
    // Standard host-based pg_dump
    const hostArgs = [...pgArgs, '-f', outputPath];
    const command = `pg_dump ${hostArgs.join(' ')}`;
    
    try {
      await execAsync(command, {
        env: {
          ...process.env,
          PGPASSWORD: config.password,
        },
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
      });
    } catch (error: any) {
      handlePgDumpError(error);
    }
  } else {
    // Docker-based pg_dump
    // We use spawn and pipe to safely handle binary data on any platform
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const fs = require('fs');
      
      const fileStream = fs.createWriteStream(outputPath);
      
      // For docker exec, we don't use -f because we'll pipe the stdout to the host file
      // We also don't need -h localhost since we're inside the container
      const dockerPgArgs = pgArgs.filter(arg => arg !== '-h' && arg !== config.host);
      
      const dockerArgs = [
        'exec',
        '-i', // Interactive but not TTY
        '-e', `PGPASSWORD=${config.password}`,
        config.containerName!,
        'pg_dump',
        ...dockerPgArgs
      ];

      console.log(`[Backup] Executing: docker ${dockerArgs.join(' ')} > ${outputPath}`);

      const child = spawn('docker', dockerArgs);
      
      child.stdout.pipe(fileStream);

      let stderr = '';
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Docker pg_dump failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err: Error) => {
        reject(new Error(`Failed to start Docker process: ${err.message}`));
      });
    });
  }
}

/**
 * Handle pg_dump errors with helpful messages
 */
function handlePgDumpError(error: any): never {
  if (error.message.includes('command not found') || error.code === 'ENOENT') {
    throw new Error(
      'pg_dump command not found. Please install PostgreSQL client tools.'
    );
  }

  if (error.message.includes('password authentication failed')) {
    throw new Error('Database authentication failed. Check DATABASE_URL configuration.');
  }

  if (error.message.includes('could not connect')) {
    throw new Error(
      'Could not connect to database. Ensure PostgreSQL is running and accessible.'
    );
  }

  throw new Error(`pg_dump failed: ${error.message}`);
}


/**
 * Create a ZIP archive using archiver with streaming
 * @param outputPath - Path where ZIP should be created
 * @param addFiles - Async function that adds files to archive
 */
async function createZipArchive(
  outputPath: string,
  addFiles: (archive: archiver.Archiver) => Promise<void>
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: COMPRESSION_CONFIG.level },
    });

    output.on('close', () => {
      resolve();
    });

    output.on('error', (error) => {
      reject(new Error(`Output stream error: ${error.message}`));
    });

    archive.on('error', (error) => {
      reject(new Error(`Archive error: ${error.message}`));
    });

    archive.on('warning', (warning) => {
      if (warning.code !== 'ENOENT') {
        console.warn('Archive warning:', warning);
      }
    });

    // Pipe archive to output stream
    archive.pipe(output);

    try {
      // Add files using provided function
      await addFiles(archive);

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      archive.abort();
      reject(error);
    }
  });
}

