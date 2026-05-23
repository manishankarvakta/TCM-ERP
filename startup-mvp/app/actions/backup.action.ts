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
  detectBackupTypeFromFilename,
  isFullBackup,
  ensureBackupDirs,
  getBackupTypeDir,
  generateBackupFilename,
  decryptBackupFileForRestore,
  type BackupType,
  type BackupMetadata,
} from "@/lib/backup";

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
import { readFile, writeFile, unlink } from "fs/promises";
import { storage } from "@/lib/storage";
import JSZip from "jszip";
import path from "path";
import {
  generateOperationId,
  initProgress,
  updateProgress,
  updateProgressWithRecord,
  completeProgress,
  failProgress,
} from "@/lib/backup-progress";
import {
  splitSqlStatements,
  groupStatementsByTable,
  getTableExecutionOrder,
  isInsertStatement,
} from "@/lib/sql-parser";
import { Prisma } from "@prisma/client";

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
  console.log(`[Backup Action] User: ${session.user.email}, Role: ${session.user.role}, Lowercase: ${userRole}`);
  
  if (userRole !== "admin") {
    throw new Error(`Forbidden: Admin access required. Current role: ${session.user.role || 'none'}`);
  }

  return { id: session.user.id };
}

/**
 * Initialize progress tracking for a restore operation
 * This is called separately to ensure progress exists before restore starts
 */
export async function initializeRestoreProgress(
  operationId: string
): Promise<ActionResult<{ initialized: boolean }>> {
  console.log(`[Backup Action] 🚀 initializeRestoreProgress called`, {
    operationId,
    timestamp: new Date().toISOString(),
  });
  
  try {
    // Initialize progress immediately
    await initProgress(operationId, "restore", 0, 0);
    await updateProgress(operationId, { 
      stage: "Initializing restore...",
      progress: 1,
    });
    
    console.log(`[Backup Action] ✅ Progress initialized successfully`, {
      operationId,
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: true,
      data: { initialized: true },
    };
  } catch (error) {
    console.error(`[Backup Action] ❌ Error initializing restore progress:`, error, {
      operationId,
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initialize progress",
    };
  }
}

/**
 * Create a backup
 */
export async function createBackup(
  type: BackupType
): Promise<ActionResult<{ filename: string; path: string; size: number; operationId: string }>> {
  try {
    await getAdminUser();

    const operationId = generateOperationId();
    let backupPath: string;

    switch (type) {
      case "database":
        backupPath = await createDatabaseBackup(operationId);
        break;
      case "files":
        // Files backup doesn't support progress yet
        backupPath = await createFilesBackup();
        break;
      case "full":
        // Full backup doesn't support progress yet
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
        operationId: type === "database" ? operationId : "",
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
    if (!filename.match(/^backup-\d{8}-\d{6}\.(dump|zip)$/)) {
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
 * @param decrypt - If true and backup is encrypted, decrypt before download
 */
export async function downloadBackupFile(
  type: BackupType,
  filename: string,
  decrypt: boolean = false
): Promise<ActionResult<{ data: string; filename: string; mimeType: string; encrypted: boolean }>> {
  try {
    await getAdminUser();

    // Validate filename
    if (!filename.match(/^backup-\d{8}-\d{6}\.(dump|zip)$/)) {
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

    // Check if backup is encrypted
    const { loadBackupMetadata } = await import("@/lib/backup-metadata");
    const metadata = await loadBackupMetadata(backupPath);
    const isEncrypted = metadata?.encrypted || false;

    // Read and optionally decrypt file
    let buffer: Buffer;
    let downloadFilename = filename;
    
    if (isEncrypted && decrypt) {
      // Decrypt the backup
      try {
        buffer = await decryptBackupFileForRestore(backupPath);
        // Remove .encrypted extension from filename for download
        downloadFilename = filename;
      } catch (error) {
        return {
          success: false,
          error: `Failed to decrypt backup: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    } else {
      // Read encrypted or unencrypted file as-is
      buffer = await readFile(backupPath);
      if (isEncrypted && !decrypt) {
        // Keep .encrypted extension for encrypted downloads
        downloadFilename = `${filename}.encrypted`;
      }
    }

    // Convert buffer to base64 string
    const base64Data = buffer.toString("base64");

    // Determine MIME type
    const mimeType = filename.endsWith(".dump")
      ? "application/octet-stream"
      : "application/zip";

    return {
      success: true,
      data: {
        data: base64Data,
        filename: downloadFilename,
        mimeType,
        encrypted: isEncrypted && !decrypt,
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
 * Get column name mappings for a table from Prisma schema
 * Maps lowercase column names to their camelCase equivalents
 */
function getTableColumnMappings(tableName: string): Map<string, string> {
  const mappings = new Map<string, string>();
  
  try {
    const dmmf = Prisma.dmmf;
    const model = dmmf.datamodel.models.find((m) => m.name === tableName);
    
    if (model) {
      model.fields.forEach((field) => {
        // Get the actual database column name (dbName or field name)
        const dbColumnName = field.dbName || field.name;
        // Map both the actual name and lowercase version to the correct name
        mappings.set(dbColumnName.toLowerCase(), dbColumnName);
        mappings.set(dbColumnName, dbColumnName); // Also map the correct name to itself
      });
    }
  } catch {
    console.warn(`Could not get column mappings for ${tableName}`);
  }
  
  return mappings;
}

/**
 * Define conflict targets (unique constraints) for each table
 * Used for UPSERT operations: INSERT ... ON CONFLICT (target) DO UPDATE
 */
function getConflictTarget(tableName: string): string | null {
  const conflictTargets: Record<string, string> = {
    // Tables with unique columns (use unique column for conflict)
    User: "email",
    Account: "provider, providerAccountId", // Composite unique
    Session: "sessionToken",
    VerificationToken: "token", // Can also use identifier, token composite
    File: "storageKey",
    Unit: "symbol",
    Item: "code",
    Client: "email",
    Supplier: "email",
    Quotation: "quotationNumber",
    ItemCategory: "itemId, categoryId", // Composite unique
  };

  // Return conflict target or default to "id" (primary key)
  return conflictTargets[tableName] || "id";
}

/**
 * Normalize INSERT statement - convert lowercase column names to camelCase
 * Handles both old backups (lowercase) and new backups (camelCase)
 */
function normalizeInsertStatement(statement: string): string {
  // Match: INSERT INTO "TableName" (columns) VALUES (values)
  const match = statement.match(/INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!match) {
    return statement.trim(); // Return as-is if we can't parse it
  }

  const table = match[1];
  const columnsPart = match[2];
  const valuesPart = match[3];

  // Get column mappings for this table
  const columnMappings = getTableColumnMappings(table);

  // Convert column names: if lowercase found, convert to camelCase
  const columns = columnsPart.split(",").map((c) => {
    const trimmed = c.trim();
    // Remove quotes to get the actual column name
    const columnName = trimmed.replace(/^"|"$/g, "");
    const lowerColumnName = columnName.toLowerCase();
    
    // Check if we have a mapping (either lowercase -> camelCase or camelCase -> camelCase)
    const mappedName = columnMappings.get(lowerColumnName) || columnMappings.get(columnName) || columnName;
    
    // Return quoted column name
    return `"${mappedName}"`;
  });

  // Reconstruct the INSERT statement with corrected column names
  return `INSERT INTO "${table}" (${columns.join(", ")}) VALUES (${valuesPart})`;
}

/**
 * Convert INSERT statement to UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
 * This allows updating existing records or inserting new ones
 */
function convertInsertToUpsert(statement: string): string {
  // First normalize column names
  const normalized = normalizeInsertStatement(statement);
  
  // Match: INSERT INTO "TableName" (columns) VALUES (values)
  const match = normalized.match(/INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!match) {
    return normalized; // Return normalized if we can't parse it
  }

  const table = match[1];
  const columnsPart = match[2];
  const valuesPart = match[3];

  // Get conflict target for this table
  const conflictTarget = getConflictTarget(table);
  if (!conflictTarget) {
    return normalized; // No conflict target, return as INSERT
  }

  // Parse columns
  const columns = columnsPart.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  // Find conflict column indices (handle composite keys)
  const conflictColumns = conflictTarget.split(",").map((c) => c.trim());
  const conflictIndices: number[] = [];
  const conflictColumnNames: string[] = [];

  for (const conflictCol of conflictColumns) {
    const index = columns.findIndex((col) => col.toLowerCase() === conflictCol.toLowerCase());
    if (index !== -1) {
      conflictIndices.push(index);
      conflictColumnNames.push(`"${columns[index]}"`);
    }
  }

  if (conflictIndices.length === 0) {
    // Conflict column not found in INSERT, return as INSERT
    return normalized;
  }

  // Build UPDATE clause - update all columns except conflict columns and createdAt
  const updateClauses: string[] = [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const isConflictCol = conflictIndices.includes(i);
    const isCreatedAt = col.toLowerCase() === "createdat";
    const isUpdatedAt = col.toLowerCase() === "updatedat";

    if (!isConflictCol && !isCreatedAt) {
      if (isUpdatedAt) {
        // Always update updatedAt to current timestamp
        updateClauses.push(`"${col}" = CURRENT_TIMESTAMP`);
      } else {
        // Update with new value from VALUES
        updateClauses.push(`"${col}" = EXCLUDED."${col}"`);
      }
    }
    // Skip conflict columns (don't update them)
    // Skip createdAt (preserve original)
  }

  if (updateClauses.length === 0) {
    // Nothing to update, return as INSERT
    return normalized;
  }

  // Build UPSERT statement
  const conflictTargetStr = conflictColumnNames.join(", ");
  const updateClauseStr = updateClauses.join(", ");

  return `INSERT INTO "${table}" (${columnsPart}) VALUES (${valuesPart}) ON CONFLICT (${conflictTargetStr}) DO UPDATE SET ${updateClauseStr}`;
}

/**
 * Parse INSERT statement to extract table name and record identifier
 */
function parseInsertStatement(statement: string): { table: string; identifier: string } | null {
  // Match: INSERT INTO "TableName" (columns) VALUES (values)
  const match = statement.match(/INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const table = match[1];
  const columns = match[2].split(",").map((c) => c.trim().replace(/"/g, ""));
  const values = match[3].split(",").map((v) => v.trim());

  // Extract identifier based on table type
  let identifier = "Unknown";
  
  // Find relevant columns for identifier
  const nameIndex = columns.findIndex((c) => c.toLowerCase() === "name");
  const emailIndex = columns.findIndex((c) => c.toLowerCase() === "email");
  const codeIndex = columns.findIndex((c) => c.toLowerCase() === "code");
  const quotationNumberIndex = columns.findIndex((c) => c.toLowerCase() === "quotationnumber");
  const symbolIndex = columns.findIndex((c) => c.toLowerCase() === "symbol");
  const identifierIndex = columns.findIndex((c) => c.toLowerCase() === "identifier");
  const tokenIndex = columns.findIndex((c) => c.toLowerCase() === "token");
  const idIndex = columns.findIndex((c) => c.toLowerCase() === "id");

  // Extract value (remove quotes)
  const getValue = (index: number): string => {
    if (index === -1 || index >= values.length) return "";
    let val = values[index].trim();
    // Remove surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    return val;
  };

  // Determine identifier based on table
  if (table === "User") {
    identifier = getValue(nameIndex) || getValue(emailIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "Item") {
    identifier = getValue(codeIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "Client" || table === "Supplier") {
    identifier = getValue(nameIndex) || getValue(emailIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "Quotation") {
    identifier = getValue(quotationNumberIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "Category") {
    identifier = getValue(nameIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "Unit") {
    identifier = getValue(symbolIndex) || getValue(idIndex) || "Unknown";
  } else if (table === "VerificationToken") {
    identifier = getValue(identifierIndex) || getValue(tokenIndex) || "Unknown";
  } else {
    identifier = getValue(nameIndex) || getValue(codeIndex) || getValue(idIndex) || "Unknown";
  }

  return { table, identifier };
}

/**
 * Restore from a backup
 * Returns progress information for tracking
 */
export async function restoreBackup(
  type: BackupType,
  filename: string,
  operationId?: string
): Promise<ActionResult<{ 
  restored: boolean; 
  databaseRecords?: number; 
  filesRestored?: number;
  errors?: number;
  operationId?: string;
}>> {
  // Generate operationId early and initialize progress immediately
  // This ensures progress is available when UI starts polling
  // MUST be done BEFORE any async operations to prevent 404 errors
  const opId = operationId || generateOperationId();
  
  console.log(`[Backup Action] 🔄 restoreBackup called`, {
    type,
    filename,
    operationId,
    generatedOpId: opId,
    timestamp: new Date().toISOString(),
  });
  
  // Initialize progress IMMEDIATELY before any async operations
  // This prevents 404 errors when UI polls for progress
  await initProgress(opId, "restore", 0, 0);
  await updateProgress(opId, { 
    stage: "Initializing restore...",
    progress: 2,
  });
  
  console.log(`[Backup Action] ✅ Progress initialized in restoreBackup`, {
    opId,
    timestamp: new Date().toISOString(),
  });
  
  try {
    await updateProgress(opId, { 
      stage: "Validating permissions...",
      progress: 5,
    });
    
    await getAdminUser();

    // Validate filename
    await updateProgress(opId, { 
      stage: "Validating backup file...",
      progress: 8,
    });
    
    if (!filename.match(/^backup-\d{8}-\d{6}\.(dump|zip)$/)) {
      await failProgress(opId, "Invalid backup filename");
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
      await updateProgress(opId, { 
        stage: "Reading backup file...",
        progress: 10,
      });

      // Check if this is a .dump file (pg_dump format)
      const isDumpFile = filename.endsWith(".dump");

      if (isDumpFile) {
        // Use pg_restore for .dump files - "time travel" restore
        try {
          // Decrypt backup if encrypted, otherwise use as-is
          let tempDumpPath = backupPath;
          let tempDecryptedPath: string | null = null;

          // Check if encrypted and decrypt if needed
          const metadata = await import("@/lib/backup-metadata").then(m => m.loadBackupMetadata(filename));
          if (metadata?.encrypted) {
            await updateProgress(opId, { 
              stage: "Decrypting backup file...",
              progress: 20,
            });
            const backupBuffer = await decryptBackupFileForRestore(backupPath);
            
            // Save decrypted content to temporary file for pg_restore
            tempDecryptedPath = backupPath.replace(/\.dump$/, ".temp.dump");
            await writeFile(tempDecryptedPath, backupBuffer);
            tempDumpPath = tempDecryptedPath;
          }

          // Parse database connection details
          const dbConfig = parseDatabaseUrl();

          await updateProgress(opId, { 
            stage: "Preparing database for time travel restore...",
            progress: 30,
          });

          // First, drop all existing tables to ensure complete restoration
          // This ensures we return to the exact state at backup time
          try {
            await updateProgress(opId, { 
              stage: "Dropping existing database objects...",
              progress: 40,
            });
            const dropAllTablesQuery = `
              DO $$ DECLARE
                r RECORD;
              BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                  EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
              END $$;
            `;
            await prisma.$executeRawUnsafe(dropAllTablesQuery);
          } catch (dropError) {
            console.warn("Error dropping tables (will continue with pg_restore --clean):", dropError);
            // Continue with pg_restore --clean as fallback
          }

          await updateProgress(opId, { 
            stage: "Restoring database from backup (time travel)...",
            progress: 50,
          });

          // Build pg_restore command
          // --clean: Drop database objects before recreating (ensures time travel)
          // --if-exists: Don't error if objects don't exist
          // --create: Create database (not needed, we're restoring to existing)
          const pgRestoreCommand = [
            "pg_restore",
            `--host=${dbConfig.host}`,
            `--port=${dbConfig.port}`,
            `--username=${dbConfig.user}`,
            `--dbname=${dbConfig.database}`,
            "--clean", // Drop database objects before recreating (time travel)
            "--if-exists", // Don't error if objects don't exist
            "--no-owner", // Don't restore ownership
            "--no-acl", // Don't restore access privileges
            "--verbose", // Show progress
            tempDumpPath,
          ];

          // Set PGPASSWORD environment variable
          const env = {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          };

          // Execute pg_restore
          const { execFile } = await import("child_process");
          const { promisify } = await import("util");
          const execFileAsync = promisify(execFile);

          const { stdout, stderr } = await execFileAsync("pg_restore", pgRestoreCommand.slice(1), {
            env,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });

          // Parse pg_restore output for progress (verbose mode shows table names)
          if (stdout) {
            const lines = stdout.toString().split("\n");
            let processedTables = 0;
            const tableMatches: string[] = [];
            
            for (const line of lines) {
              // Extract table name from pg_restore output
              const tableMatch = line.match(/processing data for table "([^"]+)"/i) || 
                                 line.match(/restoring data for table "([^"]+)"/i);
              if (tableMatch) {
                const tableName = tableMatch[1];
                if (!tableMatches.includes(tableName)) {
                  tableMatches.push(tableName);
                  processedTables++;
                  
                  // Estimate progress (pg_restore doesn't give exact counts)
                  // We'll update as we see more tables, maxing at 90% until complete
                  const estimatedProgress = Math.min(90, Math.round((processedTables / Math.max(tableMatches.length * 2, 10)) * 90));
                  
                  await updateProgress(opId, {
                    stage: `Restoring table: ${tableName}...`,
                    currentTable: tableName,
                    completedTables: processedTables,
                    progress: estimatedProgress,
                  });
                }
              }
            }
          }

          // Clean up temporary decrypted file if created
          if (tempDecryptedPath) {
            try {
              await unlink(tempDecryptedPath);
            } catch (cleanupError) {
              console.error("Error cleaning up temporary decrypted file:", cleanupError);
          }
        }

        await updateProgress(opId, {
            stage: "Database restore completed successfully",
            progress: 100,
          });
          await completeProgress(opId);
          
          // pg_restore doesn't give us exact record counts, so we estimate
          databaseRecords = 1; // Indicate success
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Provide helpful error messages
          if (errorMessage.includes("ENOENT") || errorMessage.includes("pg_restore")) {
            await failProgress(opId, "pg_restore command not found. Please install PostgreSQL client tools.");
            return {
              success: false,
              error: "pg_restore command not found. Please ensure PostgreSQL client tools are installed.",
            };
          }
          
          if (errorMessage.includes("password") || errorMessage.includes("authentication")) {
            await failProgress(opId, "Database authentication failed.");
            return {
              success: false,
              error: "Database authentication failed. Please check your DATABASE_URL configuration.",
            };
          }
          
          if (errorMessage.includes("connection") || errorMessage.includes("ECONNREFUSED")) {
            await failProgress(opId, "Cannot connect to database.");
            return {
              success: false,
              error: "Cannot connect to database. Please ensure the database server is running.",
            };
          }
          
          await failProgress(opId, errorMessage);
          return {
            success: false,
            error: `Restore failed: ${errorMessage}`, 
          };
        }
      } else {
        // Unknown file format
        return {
          success: false,
          error: `Unsupported backup file format. Expected .dump file, got: ${filename}`,
        };
      }
    } else if (type === "files") {
            await updateProgress(opId, {
        stage: "Preparing for time travel restore...",
        progress: 10,
      });

      // Decrypt backup if encrypted, otherwise read as-is
            await updateProgress(opId, {
        stage: "Reading backup file...",
        progress: 15,
      });
      
      let zipBuffer: Buffer;
      try {
        zipBuffer = await decryptBackupFileForRestore(backupPath);
        if (zipBuffer.length === 0) {
          throw new Error("Backup file is empty");
        }
      } catch (error) {
        await failProgress(opId, `Failed to read backup file: ${error instanceof Error ? error.message : "Unknown error"}`);
        return {
          success: false,
          error: `Failed to read backup file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }

      // Time travel: Delete all existing files from MinIO before restoring
      // This ensures we return to the exact state at backup time
        await updateProgress(opId, {
        stage: "Deleting existing files (time travel)...",
        progress: 25,
      });
      try {
        const allObjects = await storage.listFiles("");
        let deletedCount = 0;
        for (const objectKey of allObjects) {
          // Skip folder markers
          if (objectKey.endsWith("/")) continue;
          try {
            await storage.deleteFile(objectKey);
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting file ${objectKey}:`, error);
          }
        }
        console.log(`[Time Travel] Deleted ${deletedCount} existing files from local storage`);
      } catch (error) {
        console.error("Error deleting existing files:", error);
        // Continue with restore even if deletion fails
      }

      // Also delete all file records from database for time travel
      await updateProgress(opId, { 
        stage: "Clearing file database records...",
        progress: 35,
      });
      try {
        await prisma.file.deleteMany({});
        console.log("[Time Travel] Cleared all file records from database");
      } catch (error) {
        console.error("Error clearing file records:", error);
        // Continue with restore
      }

      // Restore files from ZIP
      await updateProgress(opId, { 
        stage: "Extracting backup archive...",
        progress: 45,
      });
      
      const zip = await JSZip.loadAsync(zipBuffer);

      const fileEntries = Object.entries(zip.files).filter(([, file]) => !file.dir);
      const totalFiles = fileEntries.length;

      await updateProgress(opId, { 
        totalRecords: totalFiles,
        totalTables: 1, // For progress calculation
        stage: `Restoring ${totalFiles} files...`,
        progress: 50,
      });

      // Extract and save each file to local storage
      for (const [relativePath, file] of fileEntries) {
        try {
          const fileBuffer = await file.async("nodebuffer");
          await storage.saveFile(relativePath, fileBuffer);
          filesRestored++;
          
          // Calculate progress percentage
          const progressPercent = totalFiles > 0 
            ? Math.round((filesRestored / totalFiles) * 100)
            : 0;
          
          await updateProgress(opId, {
            completedRecords: filesRestored,
            progress: progressPercent,
            stage: `Restored ${filesRestored}/${totalFiles} files...`,
          });
        } catch (error) {
          console.error(`Error restoring file ${relativePath}:`, error);
          errors++;
          // Continue with other files
        }
      }
      await updateProgress(opId, { 
        stage: "Files restore completed successfully (time travel)",
        progress: 100,
      });
      await completeProgress(opId);
    } else if (type === "full") {
      await updateProgress(opId, { 
        stage: "Preparing for full backup restore...",
        progress: 5,
      });

      // Decrypt backup if encrypted, otherwise read as-is
      let zipBuffer: Buffer;
      try {
        zipBuffer = await decryptBackupFileForRestore(backupPath);
        if (zipBuffer.length === 0) {
          throw new Error("Backup file is empty");
        }
          } catch (error) {
        await failProgress(opId, `Failed to read backup file: ${error instanceof Error ? error.message : "Unknown error"}`);
        return {
          success: false,
          error: `Failed to read backup file: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }

      // Restore full backup (database + files)
      await updateProgress(opId, { 
        stage: "Extracting backup archive...",
        progress: 10,
      });
      
      const zip = await JSZip.loadAsync(zipBuffer);

      // Check for database.dump
      const dbDumpFile = zip.file("database.dump");

      if (dbDumpFile) {
        // Use pg_restore for .dump files
        await updateProgress(opId, { 
          stage: "Extracting database backup...",
          progress: 15,
        });

        // Extract dump file to temporary location
        const dumpBuffer = await dbDumpFile.async("nodebuffer");
        const tempDumpPath = path.join(getBackupTypeDir("full"), `temp_restore_${Date.now()}.dump`);
        await writeFile(tempDumpPath, dumpBuffer);

        try {
          // Parse database connection details
          const dbConfig = parseDatabaseUrl();

          await updateProgress(opId, {
            stage: "Restoring database with pg_restore...",
            progress: 20,
          });

          // Build pg_restore command
          const pgRestoreCommand = [
            "pg_restore",
            `--host=${dbConfig.host}`,
            `--port=${dbConfig.port}`,
            `--username=${dbConfig.user}`,
            `--dbname=${dbConfig.database}`,
            "--clean",
            "--if-exists",
            "--no-owner",
            "--no-acl",
            "--verbose",
            tempDumpPath,
          ];

          // Set PGPASSWORD environment variable
          const env = {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          };

          // Execute pg_restore
          const { execFile } = await import("child_process");
          const { promisify } = await import("util");
          const execFileAsync = promisify(execFile);

          await execFileAsync("pg_restore", pgRestoreCommand.slice(1), {
            env,
            maxBuffer: 10 * 1024 * 1024,
          });

              await updateProgress(opId, {
            stage: "Database restore completed successfully",
            progress: 50,
          });
          databaseRecords = 1; // Indicate success

          // Clean up temporary file
          await unlink(tempDumpPath);
        } catch (error) {
          // Clean up temporary file on error
          try {
            await unlink(tempDumpPath);
          } catch {}
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("Error restoring database from dump:", errorMessage);
          errors++;
        }
      } else {
        // No database backup found in full backup
        console.warn("Full backup does not contain database.dump");
      }

      // Extract files and restore files (time travel)
      const filesZip = zip.file("files.zip");
      const filesFolder = zip.folder("files");
      
      if (filesZip || (filesFolder && Object.keys(zip.files).some(k => k.startsWith("files/")))) {
        await updateProgress(opId, {
          stage: "Preparing files for time travel restore...",
          progress: 55,
        });

        // Time travel: Delete all existing files from local storage before restoring
        try {
          const allObjects = await storage.listFiles("");
          let deletedCount = 0;
          for (const objectKey of allObjects) {
            // Skip folder markers
            if (objectKey.endsWith("/")) continue;
            try {
              await storage.deleteFile(objectKey);
              deletedCount++;
            } catch (error) {
              console.error(`Error deleting file ${objectKey}:`, error);
            }
          }
          console.log(`[Time Travel] Deleted ${deletedCount} existing files from local storage`);
        } catch (error) {
          console.error("Error deleting existing files:", error);
          // Continue with restore
        }

        // Also delete all file records from database
        try {
          await prisma.file.deleteMany({});
          console.log("[Time Travel] Cleared all file records from database");
        } catch (error) {
          console.error("Error clearing file records:", error);
        }

        await updateProgress(opId, { 
          stage: "Extracting files archive...",
          progress: 60,
        });
        
        let fileEntries: [string, any][] = [];
        
        if (filesZip) {
          const filesZipBuffer = await filesZip.async("nodebuffer");
          const filesZipArchive = await JSZip.loadAsync(filesZipBuffer);
          fileEntries = Object.entries(filesZipArchive.files).filter(([, file]) => !file.dir);
        } else {
          // New format: files are in the "files/" directory of the main ZIP
          fileEntries = Object.entries(zip.files)
            .filter(([path, file]) => path.startsWith("files/") && !file.dir)
            .map(([path, file]) => [path.replace(/^files\//, ""), file]);
        }

        const totalFiles = fileEntries.length;

        await updateProgress(opId, { 
          totalRecords: totalFiles,
          totalTables: 1, // For progress calculation
          stage: `Restoring ${totalFiles} files...`,
          progress: 65,
        });

        for (const [relativePath, file] of fileEntries) {
          try {
            const fileBuffer = await file.async("nodebuffer");
            await storage.saveFile(relativePath, fileBuffer);
            filesRestored++;
            
            // Calculate progress percentage for full backup (65% base + up to 30% for files)
            const filesProgressPercent = totalFiles > 0 
              ? Math.round((filesRestored / totalFiles) * 30) // 30% of total progress for files
              : 0;
            const totalProgress = Math.min(65 + filesProgressPercent, 95);
            
            await updateProgress(opId, {
              completedRecords: filesRestored,
              progress: totalProgress,
              stage: `Restored ${filesRestored}/${totalFiles} files...`,
            });
          } catch (error) {
            console.error(`Error restoring file ${relativePath}:`, error);
            errors++;
          }
        }
        await updateProgress(opId, { 
          stage: "Files restore completed successfully (time travel)",
          progress: 95,
        });
      }

      // Complete full backup restore
      await updateProgress(opId, { 
        stage: "Full backup restore completed successfully",
        progress: 100,
      });
      await completeProgress(opId);
    }

    return {
      success: true,
      data: {
        restored: true,
        databaseRecords: type === "database" || type === "full" ? databaseRecords : undefined,
        filesRestored: type === "files" || type === "full" ? filesRestored : undefined,
        errors: errors > 0 ? errors : undefined,
        operationId: opId, // Always return operationId for progress tracking
      },
    };
  } catch (error) {
    console.error("restoreBackup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to restore backup";
    
    // Mark progress as failed - use opId which is always defined
    try {
      await failProgress(opId, errorMessage);
    } catch (progressError) {
      console.error("Error updating progress:", progressError);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload and restore from a backup file
 * Accepts a file upload, detects backup type, and restores it
 */
export async function uploadAndRestoreBackup(
  formData: FormData,
  operationId?: string
): Promise<ActionResult<{ 
  restored: boolean; 
  backupType: BackupType;
  databaseRecords?: number; 
  filesRestored?: number;
  errors?: number;
  operationId?: string;
}>> {
  // Generate operationId early and initialize progress immediately
  // This ensures progress is available when UI starts polling
  const opId = operationId || generateOperationId();
  
  // Initialize progress immediately before any async operations
  // This prevents 404 errors when UI polls for progress
  initProgress(opId, "restore", 0, 0);
        await updateProgress(opId, {
    stage: "Processing uploaded file...",
    progress: 2,
  });
  
  try {
    await getAdminUser();

    // Get file from FormData
        await updateProgress(opId, {
      stage: "Reading uploaded file...",
      progress: 5,
    });
    
    const file = formData.get("file") as File;
    if (!file) {
      await failProgress(opId, "No file provided");
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Validate file type (handle .encrypted extension)
        await updateProgress(opId, {
      stage: "Validating file type...",
      progress: 8,
    });
    
    const fileName = file.name.toLowerCase();
    const isEncryptedFile = fileName.endsWith(".encrypted");
    const baseFileName = isEncryptedFile 
      ? fileName.replace(/\.encrypted$/, "")
      : fileName;
    const isDump = baseFileName.endsWith(".dump");
    const isZip = baseFileName.endsWith(".zip");

    if (!isDump && !isZip) {
      await failProgress(opId, "Invalid file type. Only .dump and .zip files are allowed.");
      return {
        success: false,
        error: "Invalid file type. Only .dump and .zip files (optionally .encrypted) are allowed.",
      };
    }

    // Convert File to Buffer
        await updateProgress(opId, {
      stage: "Converting file to buffer...",
      progress: 10,
    });
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect backup type
        await updateProgress(opId, {
      stage: "Detecting backup type...",
      progress: 15,
    });
    
    let backupType: BackupType;
    let tempFilename: string;
    let tempFilePath: string;

    if (isDump) {
      // Dump file = database backup
      backupType = "database";
      tempFilename = generateBackupFilename("database", "dump");
      tempFilePath = path.join(getBackupTypeDir("database"), tempFilename);
    } else {
      // ZIP file - check if it's a full backup
      // Note: If encrypted, we need to decrypt first to check contents
      // For now, we'll save as-is and let restoreBackup handle decryption
      const isFull = await isFullBackup(buffer);
      if (isFull) {
        backupType = "full";
        tempFilename = generateBackupFilename("full", "zip");
        tempFilePath = path.join(getBackupTypeDir("full"), tempFilename);
      } else {
        backupType = "files";
        tempFilename = generateBackupFilename("files", "zip");
        tempFilePath = path.join(getBackupTypeDir("files"), tempFilename);
      }
    }

    // Ensure backup directories exist
        await updateProgress(opId, {
      stage: "Preparing backup directories...",
      progress: 18,
    });
    
    await ensureBackupDirs();

    // If uploaded file is encrypted, save with .encrypted extension
    // Otherwise save normally
    const finalTempPath = isEncryptedFile 
      ? `${tempFilePath}.encrypted`
      : tempFilePath;

    // Save file temporarily
        await updateProgress(opId, {
      stage: "Saving uploaded file...",
      progress: 20,
    });
    
    await writeFile(finalTempPath, buffer);

    // If encrypted, create metadata file for restoreBackup to recognize it
    if (isEncryptedFile) {
      await updateProgress(opId, { 
        stage: "Creating metadata file...",
        progress: 22,
      });
      
      const { saveBackupMetadata } = await import("@/lib/backup-metadata");
      // Note: We don't have full metadata for uploaded files
      // The restore will need to handle this case or we'd need to upload metadata separately
      // For now, we'll save a minimal metadata file
      await saveBackupMetadata({
        filename: tempFilename,
        type: backupType,
        encrypted: true,
        createdAt: new Date().toISOString(),
      });
    }

    try {
      // Restore from the temporary file
      // Use original filename (without .encrypted) for restoreBackup
      // Pass operationId to enable progress tracking
      await updateProgress(opId, { 
        stage: "Starting restore process...",
        progress: 25,
      });
      
      const restoreResult = await restoreBackup(backupType, tempFilename, opId);

      // Clean up temporary file (handle both encrypted and unencrypted paths)
      try {
        await unlink(finalTempPath);
        // Also try to delete metadata if it exists
        if (isEncryptedFile) {
          const { deleteBackupMetadata } = await import("@/lib/backup-metadata");
          await deleteBackupMetadata(finalTempPath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
        // Don't fail the restore if cleanup fails
      }

      if (!restoreResult.success) {
        await failProgress(opId, restoreResult.error || "Failed to restore backup");
        return {
          success: false,
          error: restoreResult.error || "Failed to restore backup",
        };
      }

      return {
        success: true,
        data: {
          restored: true,
          backupType,
          databaseRecords: restoreResult.data?.databaseRecords,
          filesRestored: restoreResult.data?.filesRestored,
          errors: restoreResult.data?.errors,
          operationId: opId, // Return operationId for progress tracking
        },
      };
    } catch (restoreError) {
      // Clean up temporary file even if restore fails
      try {
        await unlink(finalTempPath);
        if (isEncryptedFile) {
          const { deleteBackupMetadata } = await import("@/lib/backup-metadata");
          await deleteBackupMetadata(finalTempPath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file after restore failure:", cleanupError);
      }

      throw restoreError;
    }
  } catch (error) {
    console.error("uploadAndRestoreBackup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload and restore backup";
    
    // Mark progress as failed
    try {
      await failProgress(opId, errorMessage);
    } catch (progressError) {
      console.error("Error updating progress:", progressError);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}


