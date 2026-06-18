import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { prisma } from "./prisma";
import { storage } from "./storage";
import {
  generateOperationId,
  initProgress,
  updateProgress,
  updateProgressWithRecord,
  completeTable,
  completeProgress,
  failProgress,
  getProgress,
  type BackupProgress,
} from "./backup-progress";
import { Prisma } from "@prisma/client";
import {
  encryptBackupFile,
  decryptBackupFile,
  isEncryptionEnabled,
  verifyChecksum,
  type EncryptionResult,
} from "./backup-encryption";
import {
  saveBackupMetadata,
  loadBackupMetadata,
  deleteBackupMetadata,
  getEncryptedBackupPath,
  getOriginalBackupPath,
  isEncryptedBackup as checkIsEncryptedBackup,
  type BackupEncryptionMetadata,
} from "./backup-metadata";
import { createMetadata } from "./backup/metadata";
import { METADATA_FILENAME, FILES_DIRECTORY_NAME } from "./backup/config";
import { 
  type BackupMetadata as UnifiedMetadata,
  type BackupType as UnifiedBackupType 
} from "@/types/backup";

/**
 * Backup types
 */
export type BackupType = "database" | "files" | "full";

/**
 * Backup metadata
 */
export interface BackupMetadata {
  filename: string;
  type: BackupType;
  size: number;
  createdAt: Date;
  path: string;
  encrypted?: boolean; // Whether this backup is encrypted
  checksum?: string; // SHA-256 checksum (if encrypted)
}

/**
 * Get backup directory path
 * Uses process.cwd() for Next.js compatibility
 */
function getBackupDir(): string {
  const backupDir = path.join(process.cwd(), "backups");
  return backupDir;
}

/**
 * Get backup subdirectory for a specific type
 */
export function getBackupTypeDir(type: BackupType): string {
  return path.join(getBackupDir(), type);
}

/**
 * Ensure backup directories exist
 */
export async function ensureBackupDirs(): Promise<void> {
  const backupDir = getBackupDir();
  const databaseDir = getBackupTypeDir("database");
  const filesDir = getBackupTypeDir("files");
  const fullDir = getBackupTypeDir("full");

  await fs.mkdir(databaseDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(fullDir, { recursive: true });
}

/**
 * Generate backup filename with timestamp
 */
export function generateBackupFilename(type: BackupType, extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  return `backup-${timestamp}.${extension}`;
}

/**
 * Parse DATABASE_URL to extract connection parameters
 * Format: postgresql://user:password@host:port/database?schema=public
 */
function parseDatabaseUrl(): {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
} {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse postgresql://user:password@host:port/database?schema=public
  const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = databaseUrl.match(urlPattern);

  if (!match) {
    // Try alternative format or use environment variables
    const user = process.env.POSTGRES_USER || "postgres";
    const password = process.env.POSTGRES_PASSWORD || "postgres";
    const host = process.env.POSTGRES_HOST || "localhost";
    const port = process.env.POSTGRES_PORT || "5432";
    const database = process.env.POSTGRES_DB || process.env.DATABASE_NAME || "startup_mvp";

    return { user, password, host, port, database };
  }

  const [, user, password, host, port, database] = match;
  return { user, password, host, port, database };
}

/**
 * Parse backup metadata from filename
 */
export function parseBackupFilename(filename: string): {
  type: BackupType | null;
  timestamp: string | null;
  extension: string;
} {
  // Format: backup-YYYYMMDD-HHMMSS.{dump|zip}
  const match = filename.match(/^backup-(\d{8}-\d{6})\.(dump|zip)$/);
  if (!match) {
    return { type: null, timestamp: null, extension: path.extname(filename).slice(1) };
  }

  const [, timestamp, extension] = match;
  let type: BackupType | null = null;

  // Determine type based on extension
  if (extension === "dump") {
    type = "database";
  } else if (extension === "zip") {
    // Could be files or full, need directory context
    type = "files"; // Default, will be determined by directory
  }

  return { type, timestamp, extension };
}

/**
 * Get column mappings for a model using Prisma DMMF
 * Returns the actual database column names (preserves camelCase as per migration)
 */
function getColumnMappings(modelName: string): Map<string, string> {
  const mappings = new Map<string, string>();
  
  try {
    const dmmf = Prisma.dmmf;
    const model = dmmf.datamodel.models.find((m: any) => m.name === modelName);
    
    if (model) {
      model.fields.forEach((field: any) => {
        // Use dbName if specified (from @map), otherwise use field name as-is (camelCase)
        // The database uses camelCase column names as shown in migrations
        const dbName = field.dbName || field.name;
        mappings.set(field.name, dbName);
      });
    }
  } catch (error) {
    console.warn(`Could not get DMMF mappings for ${modelName}, using field names as-is`);
  }
  
  return mappings;
}

/**
 * Extract record identifier for progress display
 */
function getRecordIdentifier(table: string, record: any): string {
  switch (table) {
    case "User":
      return record.name || record.email || record.id;
    case "Item":
      return record.code || record.description || record.id;
    case "Client":
      return record.name || record.email || record.id;
    case "Supplier":
      return record.name || record.email || record.id;
    case "Quotation":
      return record.quotationNumber || record.subject || record.id;
    case "Category":
      return record.name || record.id;
    case "Unit":
      return record.symbol || record.details || record.id;
    case "Organization":
      return record.name || record.id;
    case "ModuleGroup":
      return record.code || record.description || record.id;
    case "Notification":
      return record.title || record.id;
    case "CoverLetter":
      return record.title || record.id;
    case "VerificationToken":
      return record.identifier || record.token;
    default:
      return record.id || record.code || record.name || "Unknown";
  }
}

/**
 * Get orderBy clause for a table based on its schema
 */
function getOrderByClause(table: string): any {
  // VerificationToken doesn't have an id field, uses composite key
  if (table === "VerificationToken") {
    return { identifier: "asc" as const, token: "asc" as const };
  }
  // All other tables have an id field
  return { id: "asc" as const };
}

/**
 * Create database backup using pg_dump
 * Creates a PostgreSQL custom format dump file (.dump)
 */
export async function createDatabaseBackup(operationId?: string): Promise<string> {
  await ensureBackupDirs();
  const filename = generateBackupFilename("database", "dump");
  const filePath = path.join(getBackupTypeDir("database"), filename);

  const opId = operationId || generateOperationId();

  // Initialize progress
  initProgress(opId, "backup", 1, 0);
  updateProgress(opId, { stage: "Starting database backup with pg_dump..." });

  try {
    // Parse database connection details
    const dbConfig = parseDatabaseUrl();

    // Build pg_dump command
    // Use custom format (-Fc) for better compression and pg_restore compatibility
    // -Fc = custom format (binary, compressed)
    const pgDumpCommand = [
      "pg_dump",
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--username=${dbConfig.user}`,
      `--dbname=${dbConfig.database}`,
      "--format=custom", // Custom format (binary)
      "--no-owner", // Don't output commands to set ownership
      "--no-acl", // Don't output access privilege commands
      "--verbose", // Verbose mode for progress
      "--file", filePath,
    ];

    // Set PGPASSWORD environment variable for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    // Execute pg_dump using child_process
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    updateProgress(opId, { stage: "Running pg_dump..." });

    // Execute pg_dump
    await execFileAsync("pg_dump", pgDumpCommand.slice(1), {
      env,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    updateProgress(opId, { stage: "Database backup completed, creating ZIP archive..." });

    // Create a ZIP with metadata
    const zip = new JSZip();
    const dbDumpContent = await fs.readFile(filePath);
    zip.file("database.dump", dbDumpContent);

    // Create unified metadata
    const backupId = filename.replace(".dump", "");
    const unifiedMetadata = createMetadata({
      id: backupId,
      type: "database",
      size: dbDumpContent.length,
      encrypted: isEncryptionEnabled(),
      database: {
        size: dbDumpContent.length,
        format: 'custom',
        tables: [], // We don't have table list here easily
      }
    });

    zip.file(METADATA_FILENAME, JSON.stringify(unifiedMetadata, null, 2));

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // Update filename to .zip
    const zipFilename = filename.replace(".dump", ".zip");
    const zipPath = filePath.replace(".dump", ".zip");

    // Write ZIP file
    await fs.writeFile(zipPath, zipBuffer);

    // Clean up temporary dump file
    await fs.unlink(filePath);

    // Encrypt backup if encryption is enabled
    let finalPath = zipPath;
    if (isEncryptionEnabled()) {
      try {
        updateProgress(opId, { stage: "Encrypting backup..." });
        
        // Encrypt the final ZIP buffer (which includes metadata)
        const encryptionResult = await encryptBackupFile(zipBuffer);
        
        // Create encrypted file path
        const encryptedPath = getEncryptedBackupPath(zipPath);
        
        // Write encrypted data (IV, salt, auth tag will be stored in metadata)
        // Format: encrypted data + auth tag (for easier handling)
        const encryptedWithTag = Buffer.concat([
          encryptionResult.encryptedBuffer,
          Buffer.from(encryptionResult.authTag, "base64"),
        ]);
        await fs.writeFile(encryptedPath, encryptedWithTag);
        
        // Save encryption metadata
        const metadata: BackupEncryptionMetadata = {
          filename: zipFilename,
          type: "database",
          encrypted: true,
          encryptionVersion: 1,
          keyVersion: 1,
          iv: encryptionResult.iv,
          salt: encryptionResult.salt,
          authTag: encryptionResult.authTag,
          checksum: encryptionResult.checksum,
          originalSize: encryptionResult.originalSize,
          encryptedSize: encryptionResult.encryptedSize,
          createdAt: new Date().toISOString(),
        };
        await saveBackupMetadata(metadata);
        
        // Delete original unencrypted file
        await fs.unlink(zipPath);
        
        finalPath = encryptedPath;
        updateProgress(opId, { stage: "Backup encrypted successfully" });
      } catch (error) {
        console.error("Failed to encrypt backup:", error);
        // Continue with unencrypted backup if encryption fails
        updateProgress(opId, { 
          stage: "Encryption failed, keeping unencrypted backup",
          errors: ((await getProgress(opId))?.errors || 0) + 1,
        });
      }
    }

    completeProgress(opId);
    return finalPath;

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Provide helpful error messages for common issues
    if (errorMessage.includes("ENOENT") || errorMessage.includes("pg_dump")) {
      failProgress(opId, "pg_dump command not found. Please install PostgreSQL client tools.");
      throw new Error("pg_dump command not found. Please ensure PostgreSQL client tools are installed.");
    }
    
    if (errorMessage.includes("password") || errorMessage.includes("authentication")) {
      failProgress(opId, "Database authentication failed. Check DATABASE_URL configuration.");
      throw new Error("Database authentication failed. Please check your DATABASE_URL configuration.");
    }
    
    if (errorMessage.includes("connection") || errorMessage.includes("ECONNREFUSED")) {
      failProgress(opId, "Cannot connect to database. Check database server is running.");
      throw new Error("Cannot connect to database. Please ensure the database server is running and accessible.");
    }
    
    failProgress(opId, errorMessage);
    throw error;
  }
}

/**
 * Create files backup from MinIO
 * Downloads all files and creates a ZIP archive
 */
export async function createFilesBackup(): Promise<string> {
  await ensureBackupDirs();
  const filename = generateBackupFilename("files", "zip");
  const filePath = path.join(getBackupTypeDir("files"), filename);

  const zip = new JSZip();

  // List all files in local storage
  const allObjects = await storage.listFiles("");

  // Add each file to ZIP
  let fileCount = 0;
  let allFilesSize = 0;
  for (const objectKey of allObjects) {
    // Skip folder markers (empty objects ending with /)
    if (objectKey.endsWith("/")) {
      continue;
    }

    try {
      const fileBuffer = await storage.readFile(objectKey);

      // Add file to ZIP preserving folder structure
      zip.file(objectKey, fileBuffer);
      fileCount++;
      allFilesSize += fileBuffer.length;
    } catch (error) {
      console.error(`Error adding file ${objectKey} to backup:`, error);
      // Continue with other files
    }
  }

  // Generate ZIP file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Create unified metadata and add to ZIP
  const backupId = filename.replace(".zip", "");
  const unifiedMetadata = createMetadata({
    id: backupId,
    type: "files",
    size: zipBuffer.length,
    encrypted: isEncryptionEnabled(),
    files: {
      count: fileCount,
      totalSize: allFilesSize,
    }
  });

  // Re-zip with metadata
  zip.file(METADATA_FILENAME, JSON.stringify(unifiedMetadata, null, 2));
  const finalZipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Write to file
  await fs.writeFile(filePath, finalZipBuffer);

  // Encrypt backup if encryption is enabled
  let finalPath = filePath;
  if (isEncryptionEnabled()) {
    try {
      // Encrypt the backup
      const encryptionResult = await encryptBackupFile(finalZipBuffer);
      
      // Create encrypted file path
      const encryptedPath = getEncryptedBackupPath(filePath);
      
      // Write encrypted data with auth tag
      const encryptedWithTag = Buffer.concat([
        encryptionResult.encryptedBuffer,
        Buffer.from(encryptionResult.authTag, "base64"),
      ]);
      await fs.writeFile(encryptedPath, encryptedWithTag);
      
      // Save encryption metadata
      const metadata: BackupEncryptionMetadata = {
        filename,
        type: "files",
        encrypted: true,
        encryptionVersion: 1,
        keyVersion: 1,
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
        authTag: encryptionResult.authTag,
        checksum: encryptionResult.checksum,
        originalSize: encryptionResult.originalSize,
        encryptedSize: encryptionResult.encryptedSize,
        createdAt: new Date().toISOString(),
      };
      await saveBackupMetadata(metadata);
      
      // Delete original unencrypted file
      await fs.unlink(filePath);
      
      finalPath = encryptedPath;
    } catch (error) {
      console.error("Failed to encrypt files backup:", error);
      // Continue with unencrypted backup if encryption fails
    }
  }

  return finalPath;
}

/**
 * Create full backup (database + files)
 */
export async function createFullBackup(): Promise<string> {
  await ensureBackupDirs();
  const filename = generateBackupFilename("full", "zip");
  const filePath = path.join(getBackupTypeDir("full"), filename);

  const zip = new JSZip();

  // Add database backup
  console.log("Creating database backup...");
  // We need the raw .dump file for the full backup, but createDatabaseBackup now creates a .zip
  // So we'll run the dump logic locally here or extract it
  const dbConfig = parseDatabaseUrl();
  const tempDumpPath = path.join(getBackupTypeDir("database"), `temp_${filename}.dump`);
  const pgDumpCommand = [
    "pg_dump",
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--username=${dbConfig.user}`,
    `--dbname=${dbConfig.database}`,
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file", tempDumpPath,
  ];
  const env = { ...process.env, PGPASSWORD: dbConfig.password };
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  await execFileAsync("pg_dump", pgDumpCommand.slice(1), { env });
  
  const dbBackupContent = await fs.readFile(tempDumpPath);
  zip.file("database.dump", dbBackupContent);
  await fs.unlink(tempDumpPath);

  // Add files from local storage under files/ directory
  console.log("Adding files to full backup...");
  const allFiles = await storage.listFiles("");
  let fileCount = 0;
  let allFilesSize = 0;
  for (const objectKey of allFiles) {
    if (objectKey.endsWith("/")) continue;
    try {
      const fileBuffer = await storage.readFile(objectKey);
      zip.file(path.join(FILES_DIRECTORY_NAME, objectKey), fileBuffer);
      fileCount++;
      allFilesSize += fileBuffer.length;
    } catch (error) {
      console.error(`Error adding file ${objectKey} to full backup:`, error);
    }
  }

  // Generate initial ZIP buffer to get size
  const initialZipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Create unified metadata and add to ZIP
  const backupId = filename.replace(".zip", "");
  const unifiedMetadata = createMetadata({
    id: backupId,
    type: "full",
    size: initialZipBuffer.length,
    encrypted: isEncryptionEnabled(),
    database: {
      size: dbBackupContent.length,
      format: 'custom',
      tables: [],
    },
    files: {
      count: fileCount,
      totalSize: allFilesSize,
    }
  });

  zip.file(METADATA_FILENAME, JSON.stringify(unifiedMetadata, null, 2));

  // Generate final ZIP file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Write to file
  await fs.writeFile(filePath, zipBuffer);

  // Encrypt backup if encryption is enabled
  let finalPath = filePath;
  if (isEncryptionEnabled()) {
    try {
      // Encrypt the backup
      const encryptionResult = await encryptBackupFile(zipBuffer);
      
      // Create encrypted file path
      const encryptedPath = getEncryptedBackupPath(filePath);
      
      // Write encrypted data with auth tag
      const encryptedWithTag = Buffer.concat([
        encryptionResult.encryptedBuffer,
        Buffer.from(encryptionResult.authTag, "base64"),
      ]);
      await fs.writeFile(encryptedPath, encryptedWithTag);
      
      // Save encryption metadata
      const metadata: BackupEncryptionMetadata = {
        filename,
        type: "full",
        encrypted: true,
        encryptionVersion: 1,
        keyVersion: 1,
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
        authTag: encryptionResult.authTag,
        checksum: encryptionResult.checksum,
        originalSize: encryptionResult.originalSize,
        encryptedSize: encryptionResult.encryptedSize,
        createdAt: new Date().toISOString(),
      };
      await saveBackupMetadata(metadata);
      
      // Delete original unencrypted file
      await fs.unlink(filePath);
      
      finalPath = encryptedPath;
    } catch (error) {
      console.error("Failed to encrypt full backup:", error);
      // Continue with unencrypted backup if encryption fails
    }
  }

  // Clean up individual backups (optional - keep them for individual restore)
  // await fs.unlink(dbBackupPath);
  // await fs.unlink(filesBackupPath);

  return finalPath;
}

/**
 * List all backups of a specific type
 */
export async function listBackups(type: BackupType): Promise<BackupMetadata[]> {
  await ensureBackupDirs();
  const typeDir = getBackupTypeDir(type);

  try {
    const files = await fs.readdir(typeDir);
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      const filePath = path.join(typeDir, file);
      
      // Skip metadata files
      if (file.endsWith(".meta.json")) {
        continue;
      }

      // Check if this is an encrypted backup
      const isEncrypted = checkIsEncryptedBackup(file);
      const originalFilename = isEncrypted 
        ? getOriginalBackupPath(file)
        : file;

      // Only include backup files (encrypted or unencrypted)
      // Only include backup files
      if (!originalFilename.startsWith("backup-") || 
          (!originalFilename.endsWith(".dump") && !originalFilename.endsWith(".zip"))) {
        continue;
      }

      const stats = await fs.stat(filePath);

      // Load encryption metadata if available
      const encryptionMetadata = await loadBackupMetadata(filePath);
      const isBackupEncrypted = encryptionMetadata?.encrypted || isEncrypted;

      // Parse filename to get timestamp
      const parsed = parseBackupFilename(originalFilename);
      const createdAt = parsed.timestamp
        ? new Date(
            parsed.timestamp.replace(
              /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/,
              "$1-$2-$3T$4:$5:$6"
            )
          )
        : stats.birthtime;

      backups.push({
        filename: isEncrypted ? originalFilename : file, // Store original filename
        type,
        size: stats.size,
        createdAt,
        path: filePath,
        encrypted: isBackupEncrypted,
        checksum: encryptionMetadata?.checksum,
      });
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  } catch (error) {
    console.error(`Error listing backups for type ${type}:`, error);
    return [];
  }
}

/**
 * Delete a backup file
 */
export async function deleteBackup(type: BackupType, filename: string): Promise<void> {
  // Validate filename to prevent directory traversal
  if (!filename.match(/^backup-\d{8}-\d{6}\.(dump|zip)$/)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(getBackupTypeDir(type), filename);

  // Verify file exists and is in the backup directory
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(getBackupTypeDir(type));
  
  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error("Invalid backup path");
  }

  // Check if encrypted backup exists
  const encryptedPath = getEncryptedBackupPath(filePath);
  let pathToDelete = filePath;
  
  try {
    await fs.access(encryptedPath);
    pathToDelete = encryptedPath; // Delete encrypted version if it exists
  } catch {
    // Encrypted version doesn't exist, use original path
  }

  // Delete the backup file
  await fs.unlink(pathToDelete);
  
  // Delete metadata file if it exists
  await deleteBackupMetadata(pathToDelete);
}

/**
 * Get backup file path for download
 * Returns encrypted path if encrypted backup exists, otherwise returns original path
 */
export function getBackupPath(type: BackupType, filename: string): string {
  // Validate filename
  if (!filename.match(/^backup-\d{8}-\d{6}\.(dump|zip)$/)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(getBackupTypeDir(type), filename);

  // Verify path is within backup directory
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(getBackupTypeDir(type));
  
  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error("Invalid backup path");
  }

  // Check if encrypted version exists
  const encryptedPath = getEncryptedBackupPath(filePath);
  try {
    // Use fs.accessSync for synchronous check (since this is a sync function)
    require("fs").accessSync(encryptedPath);
    return encryptedPath;
  } catch {
    // Encrypted version doesn't exist, return original path
    return filePath;
  }
}

/**
 * Decrypt a backup file and return the decrypted buffer
 * @param filePath - Path to encrypted backup file
 * @returns Decrypted backup data as Buffer
 * @throws Error if decryption fails
 */
export async function decryptBackupFileForRestore(filePath: string): Promise<Buffer> {
  // Load encryption metadata
  const metadata = await loadBackupMetadata(filePath);
  
  if (!metadata || !metadata.encrypted) {
    // Not encrypted, read file as-is
    return await fs.readFile(filePath);
  }

  if (!metadata.iv || !metadata.salt || !metadata.authTag) {
    throw new Error("Invalid encryption metadata: missing IV, salt, or auth tag");
  }

  // Read encrypted file
  const encryptedData = await fs.readFile(filePath);
  
  // Extract auth tag from end of file (last 16 bytes)
  const AUTH_TAG_LENGTH = 16;
  const encryptedContent = encryptedData.slice(0, -AUTH_TAG_LENGTH);
  const authTagFromFile = encryptedData.slice(-AUTH_TAG_LENGTH).toString("base64");
  
  // Use auth tag from metadata (more reliable)
  const authTag = metadata.authTag;

  // Decrypt the backup
  const decryptedData = await decryptBackupFile(
    encryptedContent,
    metadata.iv,
    metadata.salt,
    authTag
  );

  // Verify checksum if available
  if (metadata.checksum) {
    const isValid = verifyChecksum(decryptedData, metadata.checksum);
    if (!isValid) {
      throw new Error(
        "Checksum verification failed: Backup data may have been corrupted or tampered with"
      );
    }
  }

  return decryptedData;
}

/**
 * Detect backup type from filename pattern
 * Checks if filename matches backup-YYYYMMDD-HHMMSS.{sql|zip} pattern
 */
export function detectBackupTypeFromFilename(filename: string): BackupType | null {
  // Format: backup-YYYYMMDD-HHMMSS.{dump|zip}
  const match = filename.match(/^backup-(\d{8}-\d{6})\.(dump|zip)$/);
  
  if (!match) {
    return null;
  }

  const [, , extension] = match;

  // Determine type based on extension
  if (extension === "dump") {
    return "database";
  } else if (extension === "zip") {
    // ZIP files could be "files" or "full" backup
    // For uploaded files, we'll default to "files" unless we can inspect contents
    // The restore logic will handle full backups by checking for database.dump and files.zip inside
    return "files";
  }

  return null;
}

/**
 * Check if a ZIP file buffer is a full backup by inspecting contents
 * Full backups contain database.dump and files.zip
 */
export async function isFullBackup(zipBuffer: Buffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(zipBuffer);
    const hasDatabaseDump = zip.file("database.dump") !== null;
    const hasFilesZip = zip.file("files.zip") !== null;
    return hasDatabaseDump && hasFilesZip;
  } catch (error) {
    console.error("Error checking if ZIP is full backup:", error);
    return false;
  }
}


