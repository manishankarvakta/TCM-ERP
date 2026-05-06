import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

/**
 * Local Storage Configuration
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

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
 * Save a buffer to the local filesystem
 */
export async function saveFile(key: string, buffer: Buffer): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key);
  const dirPath = path.dirname(filePath);
  
  await ensureDir(dirPath);
  await fs.writeFile(filePath, buffer);
}

/**
 * Delete a file or directory from the local filesystem
 */
export async function deleteFile(key: string): Promise<void> {
  const fullPath = path.join(UPLOAD_DIR, key);
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  } catch (error) {
    // If file doesn't exist, we consider it "deleted"
    console.warn(`Attempted to delete non-existent path: ${fullPath}`);
  }
}

/**
 * Copy a file or directory on the local filesystem
 */
export async function copyFile(sourceKey: string, destKey: string): Promise<void> {
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
 * Move a file or directory on the local filesystem
 */
export async function moveFile(sourceKey: string, destKey: string): Promise<void> {
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
 * Read file as buffer
 */
export async function readFile(key: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, key);
  return await fs.readFile(filePath);
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
          // Add directory itself if it matches the prefix logic or just continue
          results.push(relativePath + '/'); 
          await traverse(fullPath);
        } else {
          results.push(relativePath);
        }
      }
    } catch (error) {
      // If path doesn't exist, just return empty
    }
  }

  // If the prefix is actually a directory, start traversing it
  // Otherwise, we'd need to handle prefix matching (e.g., "user1/folder/fi" matches "user1/folder/file.txt")
  // For simplicity and matching S3 behavior in the current code:
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
  config: {
    uploadDir: UPLOAD_DIR
  }
};
