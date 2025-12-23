/**
 * Backup Metadata Management
 * Handles storage and retrieval of backup encryption metadata
 * 
 * Metadata includes:
 * - Encryption status
 * - IV, salt, auth tag
 * - Checksum
 * - File sizes
 * - Timestamps
 */

import { promises as fs } from "fs";
import path from "path";
import type { BackupType } from "./backup";

/**
 * Backup encryption metadata structure
 */
export interface BackupEncryptionMetadata {
  filename: string;
  type: BackupType;
  encrypted: boolean;
  encryptionVersion?: number; // For future key rotation support
  keyVersion?: number; // Which encryption key was used
  iv?: string; // Base64 encoded IV
  salt?: string; // Base64 encoded salt
  authTag?: string; // Base64 encoded auth tag
  checksum?: string; // SHA-256 checksum of original file
  originalSize?: number;
  encryptedSize?: number;
  createdAt: string; // ISO timestamp
}

/**
 * Get metadata file path for a backup file
 * @param backupFilePath - Path to backup file
 * @returns Path to metadata file
 */
function getMetadataFilePath(backupFilePath: string): string {
  // Replace file extension with .meta.json
  const dir = path.dirname(backupFilePath);
  const basename = path.basename(backupFilePath, path.extname(backupFilePath));
  // Handle .encrypted extension
  const baseWithoutEncrypted = basename.replace(/\.encrypted$/, "");
  return path.join(dir, `${baseWithoutEncrypted}.meta.json`);
}

/**
 * Get encrypted backup file path
 * @param originalPath - Original backup file path
 * @returns Path to encrypted backup file
 */
export function getEncryptedBackupPath(originalPath: string): string {
  return `${originalPath}.encrypted`;
}

/**
 * Get original backup file path from encrypted path
 * @param encryptedPath - Encrypted backup file path
 * @returns Original backup file path
 */
export function getOriginalBackupPath(encryptedPath: string): string {
  if (encryptedPath.endsWith(".encrypted")) {
    return encryptedPath.slice(0, -".encrypted".length);
  }
  return encryptedPath;
}

/**
 * Check if a backup file is encrypted
 * @param filePath - Path to backup file
 * @returns true if file is encrypted
 */
export function isEncryptedBackup(filePath: string): boolean {
  return filePath.endsWith(".encrypted");
}

/**
 * Save backup encryption metadata to file
 * @param metadata - Metadata to save
 * @throws Error if save fails
 */
export async function saveBackupMetadata(
  metadata: BackupEncryptionMetadata
): Promise<void> {
  try {
    // Determine metadata file path from backup filename
    // We need the backup directory and filename
    const backupDir = path.join(process.cwd(), "backups", metadata.type);
    const backupPath = path.join(backupDir, metadata.filename);
    const metadataPath = getMetadataFilePath(backupPath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(metadataPath), { recursive: true });

    // Write metadata as JSON
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to save backup metadata: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Load backup encryption metadata from file
 * @param backupFilePath - Path to backup file (encrypted or unencrypted)
 * @returns Metadata if found, null otherwise
 */
export async function loadBackupMetadata(
  backupFilePath: string
): Promise<BackupEncryptionMetadata | null> {
  try {
    const metadataPath = getMetadataFilePath(backupFilePath);
    
    // Check if metadata file exists
    try {
      await fs.access(metadataPath);
    } catch {
      // Metadata file doesn't exist - backup is not encrypted
      return null;
    }

    // Read and parse metadata
    const metadataContent = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent) as BackupEncryptionMetadata;

    return metadata;
  } catch (error) {
    // If metadata file is corrupted or unreadable, assume backup is not encrypted
    console.warn(`Failed to load backup metadata for ${backupFilePath}:`, error);
    return null;
  }
}

/**
 * Delete backup metadata file
 * @param backupFilePath - Path to backup file
 */
export async function deleteBackupMetadata(backupFilePath: string): Promise<void> {
  try {
    const metadataPath = getMetadataFilePath(backupFilePath);
    await fs.unlink(metadataPath);
  } catch (error) {
    // Ignore errors if metadata file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Failed to delete backup metadata for ${backupFilePath}:`, error);
    }
  }
}

/**
 * List all encrypted backups with their metadata
 * @param type - Backup type to list
 * @returns Array of metadata for encrypted backups
 */
export async function listEncryptedBackups(
  type: BackupType
): Promise<BackupEncryptionMetadata[]> {
  try {
    const backupDir = path.join(process.cwd(), "backups", type);
    
    // Read all files in backup directory
    const files = await fs.readdir(backupDir);
    
    // Filter for encrypted files
    const encryptedFiles = files.filter((file) => file.endsWith(".encrypted"));
    
    // Load metadata for each encrypted backup
    const metadataList: BackupEncryptionMetadata[] = [];
    for (const file of encryptedFiles) {
      const backupPath = path.join(backupDir, file);
      const metadata = await loadBackupMetadata(backupPath);
      if (metadata && metadata.encrypted) {
        metadataList.push(metadata);
      }
    }

    return metadataList;
  } catch (error) {
    console.error(`Failed to list encrypted backups for type ${type}:`, error);
    return [];
  }
}


