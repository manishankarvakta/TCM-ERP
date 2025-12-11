"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createDatabaseBackup,
  createFilesBackup,
  createFullBackup,
  listBackups,
  deleteBackup,
  getBackupPath,
  type BackupType,
  type BackupMetadata,
} from "@/lib/backup";
import { readFile } from "fs/promises";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "@/lib/minio";
import { minio } from "@/lib/minio";
import JSZip from "jszip";

/**
 * Response type for server actions
 */
type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Helper function to verify user is admin
 */
async function getAdminUser(): Promise<{ id: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized: User must be logged in");
  }

  // Check if user is admin
  const userRole = session.user.role?.toLowerCase();
  if (userRole !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }

  return { id: session.user.id };
}

/**
 * Create a backup
 */
export async function createBackup(
  type: BackupType
): Promise<ActionResult<{ filename: string; path: string; size: number }>> {
  try {
    await getAdminUser();

    let backupPath: string;

    switch (type) {
      case "database":
        backupPath = await createDatabaseBackup();
        break;
      case "files":
        backupPath = await createFilesBackup();
        break;
      case "full":
        backupPath = await createFullBackup();
        break;
      default:
        throw new Error(`Invalid backup type: ${type}`);
    }

    // Get file stats
    const { stat } = await import("fs/promises");
    const stats = await stat(backupPath);
    const filename = backupPath.split("/").pop() || "backup";

    return {
      success: true,
      data: {
        filename,
        path: backupPath,
        size: stats.size,
      },
    };
  } catch (error) {
    console.error("createBackup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create backup",
    };
  }
}

/**
 * List all backups
 */
export async function listAllBackups(): Promise<
  ActionResult<{
    database: BackupMetadata[];
    files: BackupMetadata[];
    full: BackupMetadata[];
  }>
> {
  try {
    await getAdminUser();

    const [database, files, full] = await Promise.all([
      listBackups("database"),
      listBackups("files"),
      listBackups("full"),
    ]);

    return {
      success: true,
      data: {
        database,
        files,
        full,
      },
    };
  } catch (error) {
    console.error("listAllBackups error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list backups",
      data: {
        database: [],
        files: [],
        full: [],
      },
    };
  }
}

/**
 * Delete a backup
 */
export async function deleteBackupFile(
  type: BackupType,
  filename: string
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    await getAdminUser();

    // Validate filename to prevent directory traversal
    if (!filename.match(/^backup-\d{8}-\d{6}\.(sql|zip)$/)) {
      return {
        success: false,
        error: "Invalid backup filename",
      };
    }

    // Check if file exists before deleting
    const backupPath = getBackupPath(type, filename);
    const { stat } = await import("fs/promises");
    
    try {
      await stat(backupPath);
    } catch {
      return {
        success: false,
        error: "Backup file not found",
      };
    }

    await deleteBackup(type, filename);

    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    console.error("deleteBackupFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete backup",
    };
  }
}

/**
 * Download backup file
 * Returns file data as base64 string for client-side download
 */
export async function downloadBackupFile(
  type: BackupType,
  filename: string
): Promise<ActionResult<{ data: string; filename: string; mimeType: string }>> {
  try {
    await getAdminUser();

    // Validate filename
    if (!filename.match(/^backup-\d{8}-\d{6}\.(sql|zip)$/)) {
      return {
        success: false,
        error: "Invalid backup filename",
      };
    }

    // Verify file exists and get path
    const backupPath = getBackupPath(type, filename);
    const { stat } = await import("fs/promises");
    
    try {
      await stat(backupPath);
    } catch {
      return {
        success: false,
        error: "Backup file not found",
      };
    }

    // Read file
    const buffer = await readFile(backupPath);

    // Convert buffer to base64 string
    const base64Data = buffer.toString("base64");

    // Determine MIME type
    const mimeType = filename.endsWith(".sql") 
      ? "application/sql" 
      : "application/zip";

    return {
      success: true,
      data: {
        data: base64Data,
        filename,
        mimeType,
      },
    };
  } catch (error) {
    console.error("downloadBackupFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to download backup",
    };
  }
}

/**
 * Restore from a backup
 * Returns progress information for tracking
 */
export async function restoreBackup(
  type: BackupType,
  filename: string
): Promise<ActionResult<{ 
  restored: boolean; 
  databaseRecords?: number; 
  filesRestored?: number;
  errors?: number;
}>> {
  try {
    await getAdminUser();

    // Validate filename
    if (!filename.match(/^backup-\d{8}-\d{6}\.(sql|zip)$/)) {
      return {
        success: false,
        error: "Invalid backup filename",
      };
    }

    const backupPath = getBackupPath(type, filename);
    let databaseRecords = 0;
    let filesRestored = 0;
    let errors = 0;

    if (type === "database") {
      // Restore database from SQL file
      const sqlContent = await readFile(backupPath, "utf-8");

      // Split SQL into individual statements
      const statements = sqlContent
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      // Execute each statement
      for (const statement of statements) {
        if (statement.toLowerCase().startsWith("insert")) {
          try {
            await prisma.$executeRawUnsafe(statement);
            databaseRecords++;
          } catch (error) {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`, error);
            errors++;
            // Continue with other statements
          }
        }
      }
    } else if (type === "files") {
      // Restore files from ZIP
      const zipBuffer = await readFile(backupPath);
      const zip = await JSZip.loadAsync(zipBuffer);

      const fileEntries = Object.entries(zip.files).filter(([, file]) => !file.dir);
      const totalFiles = fileEntries.length;

      // Extract and upload each file to MinIO
      for (const [relativePath, file] of fileEntries) {
        try {
          const fileBuffer = await file.async("nodebuffer");
          const putCommand = new PutObjectCommand({
            Bucket: minio.config.bucketName,
            Key: relativePath,
            Body: fileBuffer,
          });

          await s3.send(putCommand);
          filesRestored++;
        } catch (error) {
          console.error(`Error restoring file ${relativePath}:`, error);
          errors++;
          // Continue with other files
        }
      }
    } else if (type === "full") {
      // Restore full backup (database + files)
      const zipBuffer = await readFile(backupPath);
      const zip = await JSZip.loadAsync(zipBuffer);

      // Extract database.sql
      const dbFile = zip.file("database.sql");
      if (dbFile) {
        const sqlContent = await dbFile.async("string");
        const statements = sqlContent
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          if (statement.toLowerCase().startsWith("insert")) {
            try {
              await prisma.$executeRawUnsafe(statement);
              databaseRecords++;
            } catch (error) {
              console.error(`Error executing statement: ${statement.substring(0, 100)}...`, error);
              errors++;
            }
          }
        }
      }

      // Extract files.zip and restore files
      const filesZip = zip.file("files.zip");
      if (filesZip) {
        const filesZipBuffer = await filesZip.async("nodebuffer");
        const filesZipArchive = await JSZip.loadAsync(filesZipBuffer);

        const fileEntries = Object.entries(filesZipArchive.files).filter(([, file]) => !file.dir);

        for (const [relativePath, file] of fileEntries) {
          try {
            const fileBuffer = await file.async("nodebuffer");
            const putCommand = new PutObjectCommand({
              Bucket: minio.config.bucketName,
              Key: relativePath,
              Body: fileBuffer,
            });

            await s3.send(putCommand);
            filesRestored++;
          } catch (error) {
            console.error(`Error restoring file ${relativePath}:`, error);
            errors++;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        restored: true,
        databaseRecords: type === "database" || type === "full" ? databaseRecords : undefined,
        filesRestored: type === "files" || type === "full" ? filesRestored : undefined,
        errors: errors > 0 ? errors : undefined,
      },
    };
  } catch (error) {
    console.error("restoreBackup error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore backup",
    };
  }
}


