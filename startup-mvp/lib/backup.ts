import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { prisma } from "./prisma";
import { minio, s3 } from "./minio";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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
function getBackupTypeDir(type: BackupType): string {
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
function generateBackupFilename(type: BackupType, extension: string): string {
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
 * Parse backup metadata from filename
 */
export function parseBackupFilename(filename: string): {
  type: BackupType | null;
  timestamp: string | null;
  extension: string;
} {
  // Format: backup-YYYYMMDD-HHMMSS.{sql|zip}
  const match = filename.match(/^backup-(\d{8}-\d{6})\.(sql|zip)$/);
  if (!match) {
    return { type: null, timestamp: null, extension: path.extname(filename).slice(1) };
  }

  const [, timestamp, extension] = match;
  let type: BackupType | null = null;

  // Determine type based on extension and directory (we'll need to pass directory info)
  if (extension === "sql") {
    type = "database";
  } else if (extension === "zip") {
    // Could be files or full, need directory context
    type = "files"; // Default, will be determined by directory
  }

  return { type, timestamp, extension };
}

/**
 * Create database backup using Prisma
 * Exports all tables as SQL INSERT statements
 */
export async function createDatabaseBackup(): Promise<string> {
  await ensureBackupDirs();
  const filename = generateBackupFilename("database", "sql");
  const filePath = path.join(getBackupTypeDir("database"), filename);

  // Get all tables from Prisma schema
  const tables = [
    "User",
    "Account",
    "Session",
    "VerificationToken",
    "PasswordReset",
    "UserLog",
    "File",
    "Notification",
    "Unit",
    "Organization",
    "Category",
    "Item",
    "Client",
    "Supplier",
  ];

  let sqlContent = `-- Database Backup\n`;
  sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
  sqlContent += `-- Database: ${process.env.POSTGRES_DB || "espaciodb"}\n\n`;

  // Disable foreign key checks temporarily
  sqlContent += `-- Disable foreign key checks\n`;
  sqlContent += `SET session_replication_role = 'replica';\n\n`;

  // Export each table
  for (const table of tables) {
    try {
      // Get table name in lowercase for Prisma
      const modelName = table as any;
      
      // Use Prisma to get all records
      const records = await (prisma as any)[modelName].findMany({
        orderBy: { id: "asc" },
      });

      if (records.length === 0) {
        sqlContent += `-- Table ${table}: No data\n\n`;
        continue;
      }

      sqlContent += `-- Table: ${table}\n`;
      sqlContent += `-- Records: ${records.length}\n\n`;

      // Generate INSERT statements
      for (const record of records) {
        const columns = Object.keys(record).join(", ");
        const values = Object.values(record).map((val: any) => {
          if (val === null) return "NULL";
          if (typeof val === "string") {
            return `'${val.replace(/'/g, "''")}'`;
          }
          if (val instanceof Date) {
            return `'${val.toISOString()}'`;
          }
          if (typeof val === "object") {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          }
          return String(val);
        }).join(", ");

        sqlContent += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
      }

      sqlContent += `\n`;
    } catch (error) {
      console.error(`Error backing up table ${table}:`, error);
      sqlContent += `-- Error backing up table ${table}: ${error instanceof Error ? error.message : "Unknown error"}\n\n`;
    }
  }

  // Re-enable foreign key checks
  sqlContent += `-- Re-enable foreign key checks\n`;
  sqlContent += `SET session_replication_role = 'origin';\n`;

  // Write to file
  await fs.writeFile(filePath, sqlContent, "utf-8");

  return filePath;
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

  // List all objects in MinIO bucket
  const allObjects = await minio.listObjects();

  // Download each file and add to ZIP
  let fileCount = 0;
  for (const objectKey of allObjects) {
    // Skip folder markers (empty objects ending with /)
    if (objectKey.endsWith("/")) {
      continue;
    }

    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: minio.config.bucketName,
        Key: objectKey,
      });

      const response = await s3.send(getObjectCommand);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      const fileBuffer = Buffer.concat(chunks);

      // Add file to ZIP preserving folder structure
      zip.file(objectKey, fileBuffer);
      fileCount++;
    } catch (error) {
      console.error(`Error downloading file ${objectKey}:`, error);
      // Continue with other files
    }
  }

  // Generate ZIP file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Write to file
  await fs.writeFile(filePath, zipBuffer);

  return filePath;
}

/**
 * Create full backup (database + files)
 */
export async function createFullBackup(): Promise<string> {
  await ensureBackupDirs();
  const filename = generateBackupFilename("full", "zip");
  const filePath = path.join(getBackupTypeDir("full"), filename);

  const zip = new JSZip();

  // Create database backup
  console.log("Creating database backup...");
  const dbBackupPath = await createDatabaseBackup();
  const dbBackupContent = await fs.readFile(dbBackupPath);
  zip.file("database.sql", dbBackupContent);

  // Create files backup
  console.log("Creating files backup...");
  const filesBackupPath = await createFilesBackup();
  const filesBackupContent = await fs.readFile(filesBackupPath);
  zip.file("files.zip", filesBackupContent);

  // Generate ZIP file
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Write to file
  await fs.writeFile(filePath, zipBuffer);

  // Clean up individual backups (optional - keep them for individual restore)
  // await fs.unlink(dbBackupPath);
  // await fs.unlink(filesBackupPath);

  return filePath;
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
      const stats = await fs.stat(filePath);

      // Only include backup files
      if (!file.startsWith("backup-") || (!file.endsWith(".sql") && !file.endsWith(".zip"))) {
        continue;
      }

      // Parse filename to get timestamp
      const parsed = parseBackupFilename(file);
      const createdAt = parsed.timestamp
        ? new Date(
            parsed.timestamp.replace(
              /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/,
              "$1-$2-$3T$4:$5:$6"
            )
          )
        : stats.birthtime;

      backups.push({
        filename: file,
        type,
        size: stats.size,
        createdAt,
        path: filePath,
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
  if (!filename.match(/^backup-\d{8}-\d{6}\.(sql|zip)$/)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(getBackupTypeDir(type), filename);

  // Verify file exists and is in the backup directory
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(getBackupTypeDir(type));
  
  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error("Invalid backup path");
  }

  await fs.unlink(filePath);
}

/**
 * Get backup file path for download
 */
export function getBackupPath(type: BackupType, filename: string): string {
  // Validate filename
  if (!filename.match(/^backup-\d{8}-\d{6}\.(sql|zip)$/)) {
    throw new Error("Invalid backup filename");
  }

  const filePath = path.join(getBackupTypeDir(type), filename);

  // Verify path is within backup directory
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(getBackupTypeDir(type));
  
  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error("Invalid backup path");
  }

  return filePath;
}


