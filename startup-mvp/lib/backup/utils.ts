/**
 * Backup System Utilities
 * 
 * Shared utility functions for backup operations.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { BackupType } from '@/types/backup';
import {
  BACKUP_ROOT_DIR,
  getBackupTypeDir,
  TEMP_DIR,
  generateBackupId as configGenerateBackupId,
} from './config';

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Ensure all backup directories exist
 */
export async function ensureBackupDirectories(): Promise<void> {
  const directories = [
    BACKUP_ROOT_DIR,
    getBackupTypeDir('database'),
    getBackupTypeDir('files'),
    getBackupTypeDir('full'),
    TEMP_DIR,
  ];

  for (const dir of directories) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Clean up temporary files
 * Safely deletes files, doesn't throw if files don't exist
 * @param paths - Array of file paths to delete
 */
export async function cleanupTempFiles(paths: string[]): Promise<void> {
  const results = await Promise.allSettled(
    paths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        // Ignore ENOENT errors (file doesn't exist)
        if (error.code !== 'ENOENT') {
          console.warn(`Failed to delete temp file ${filePath}:`, error.message);
        }
      }
    })
  );

  // Log any unexpected errors
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Error cleaning up ${paths[index]}:`, result.reason);
    }
  });
}

/**
 * Get backup type from file path
 * @param filePath - Full path to backup file
 * @returns Backup type or null if cannot be determined
 */
export function getBackupTypeFromPath(filePath: string): BackupType | null {
  const normalizedPath = path.normalize(filePath);
  
  if (normalizedPath.includes(path.sep + 'database' + path.sep)) {
    return 'database';
  }
  if (normalizedPath.includes(path.sep + 'files' + path.sep)) {
    return 'files';
  }
  if (normalizedPath.includes(path.sep + 'full' + path.sep)) {
    return 'full';
  }
  
  return null;
}

/**
 * Calculate SHA-256 checksum of a file
 * @param filePath - Path to file
 * @returns Checksum in format "sha256:..."
 */
export async function calculateFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('end', () => {
      resolve(`sha256:${hash.digest('hex')}`);
    });
  });
}

/**
 * Verify checksum of a file
 * @param filePath - Path to file
 * @param expectedChecksum - Expected checksum in format "sha256:..."
 * @returns True if checksum matches
 */
export async function verifyFileChecksum(
  filePath: string,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await calculateFileChecksum(filePath);
  return actualChecksum === expectedChecksum;
}

/**
 * Get available disk space for backups directory
 * @returns Available space in bytes
 */
export async function getAvailableDiskSpace(): Promise<number> {
  try {
    const { statfs } = await import('fs');
    const { promisify } = await import('util');
    const statfsAsync = promisify(statfs);
    
    const stats = await statfsAsync(BACKUP_ROOT_DIR);
    return stats.bavail * stats.bsize;
  } catch (error) {
    console.warn('Could not determine available disk space:', error);
    // Return a large number to avoid blocking operations
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Check if enough disk space is available
 * @param requiredBytes - Required space in bytes
 * @returns True if enough space is available
 */
export async function checkDiskSpace(requiredBytes: number): Promise<boolean> {
  const available = await getAvailableDiskSpace();
  return available >= requiredBytes;
}

/**
 * Get file size
 * @param filePath - Path to file
 * @returns File size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Check if file exists
 * @param filePath - Path to file
 * @returns True if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a temporary file path
 * @param prefix - Optional prefix for filename
 * @returns Path to temporary file
 */
export function generateTempFilePath(prefix: string = 'temp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filename = `${prefix}-${timestamp}-${random}`;
  return path.join(TEMP_DIR, filename);
}

/**
 * Sanitize filename to prevent path traversal
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path separators and keep only the filename
  return path.basename(filename);
}

/**
 * Generate backup ID (re-export from config)
 */
export const generateBackupId = configGenerateBackupId;

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns Result of successful operation
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Format timestamp to ISO string
 * @param date - Date object or timestamp
 * @returns ISO 8601 formatted string
 */
export function formatTimestamp(date: Date | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
}

/**
 * Parse ISO timestamp to Date
 * @param timestamp - ISO 8601 formatted string
 * @returns Date object
 */
export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

/**
 * Get current timestamp as ISO string
 */
export function now(): string {
  return new Date().toISOString();
}

