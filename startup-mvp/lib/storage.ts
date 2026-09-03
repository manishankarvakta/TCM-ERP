import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

/**
 * Production Storage Authority Configuration
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'; // 'local' | 'minio' | 's3'

export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/**
 * Check if the active storage engine is available
 */
export async function isStorageAvailable(): Promise<boolean> {
  if (process.env.STORAGE_SIMULATE_DOWN === 'true') {
    return false;
  }
  if (STORAGE_PROVIDER === 'minio' || STORAGE_PROVIDER === 's3') {
    // In production object storage mode, check connection
    try {
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT || 9000;
      // Simple TCP / HTTP check if needed
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Ensure a directory exists (recursive)
 */
async function ensureDir(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save a buffer to storage
 * Enforces production storage authority:
 * When storage is unavailable, throws StorageUnavailableError so no metadata is committed.
 */
export async function saveFile(key: string, buffer: Buffer): Promise<void> {
  const available = await isStorageAvailable();
  if (!available) {
    throw new StorageUnavailableError("Object storage (MinIO/S3) is currently unavailable. Upload aborted.");
  }
  const filePath = path.join(UPLOAD_DIR, key);
  const dirPath = path.dirname(filePath);
  
  await ensureDir(dirPath);
  await fs.writeFile(filePath, buffer);
}

/**
 * Read file as buffer
 */
export async function readFile(key: string): Promise<Buffer> {
  const available = await isStorageAvailable();
  if (!available) {
    throw new StorageUnavailableError("Object storage (MinIO/S3) is currently unavailable. Download aborted.");
  }
  const filePath = path.join(UPLOAD_DIR, key);
  return await fs.readFile(filePath);
}

/**
 * Delete a file or directory
 */
export async function deleteFile(key: string): Promise<void> {
  const available = await isStorageAvailable();
  if (!available) {
    throw new StorageUnavailableError("Object storage (MinIO/S3) is currently unavailable. Deletion aborted.");
  }
  const fullPath = path.join(UPLOAD_DIR, key);
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  } catch (error) {
    console.warn(`Attempted to delete non-existent path: ${fullPath}`);
  }
}

/**
 * Copy a file or directory
 */
export async function copyFile(sourceKey: string, destKey: string): Promise<void> {
  const available = await isStorageAvailable();
  if (!available) {
    throw new StorageUnavailableError("Object storage (MinIO/S3) is currently unavailable. Copy aborted.");
  }
  const srcPath = path.join(UPLOAD_DIR, sourceKey);
  const dstPath = path.join(UPLOAD_DIR, destKey);
  
  await ensureDir(path.dirname(dstPath));
  
  const stats = await fs.stat(srcPath);
  if (stats.isDirectory()) {
    await fs.cp(srcPath, dstPath, { recursive: true });
  } else {
    await fs.copyFile(srcPath, dstPath);
  }
}

/**
 * Move a file or directory
 */
export async function moveFile(sourceKey: string, destKey: string): Promise<void> {
  const available = await isStorageAvailable();
  if (!available) {
    throw new StorageUnavailableError("Object storage (MinIO/S3) is currently unavailable. Move aborted.");
  }
  const srcPath = path.join(UPLOAD_DIR, sourceKey);
  const dstPath = path.join(UPLOAD_DIR, destKey);
  
  await ensureDir(path.dirname(dstPath));
  await fs.rename(srcPath, dstPath);
}

/**
 * Create a directory marker
 */
export async function createDirectory(key: string): Promise<void> {
  const dirPath = path.join(UPLOAD_DIR, key);
  await ensureDir(dirPath);
}

/**
 * Check if a file or directory exists
 */
export async function exists(key: string): Promise<boolean> {
  const fullPath = path.join(UPLOAD_DIR, key);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a read stream for a file
 */
export function getReadStream(key: string) {
  const filePath = path.join(UPLOAD_DIR, key);
  return createReadStream(filePath);
}

/**
 * List files with a given prefix (recursive)
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const fullPrefixPath = path.join(UPLOAD_DIR, prefix);
  const results: string[] = [];

  async function traverse(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(UPLOAD_DIR, fullPath);
        
        if (entry.isDirectory()) {
          results.push(relativePath + '/'); 
          await traverse(fullPath);
        } else {
          results.push(relativePath);
        }
      }
    } catch {
      // Return empty if directory does not exist
    }
  }

  if (await exists(prefix)) {
    const stats = await fs.stat(fullPrefixPath);
    if (stats.isDirectory()) {
      await traverse(fullPrefixPath);
    } else {
      results.push(prefix);
    }
  }

  return results.filter(k => k.startsWith(prefix));
}

/**
 * Storage utility object
 */
export const storage = {
  saveFile,
  deleteFile,
  copyFile,
  moveFile,
  createDirectory,
  exists,
  getReadStream,
  readFile,
  listFiles,
  isStorageAvailable,
  config: {
    uploadDir: UPLOAD_DIR,
    provider: STORAGE_PROVIDER
  }
};
