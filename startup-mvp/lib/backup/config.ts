/**
 * Backup System Configuration
 * 
 * Central configuration for backup operations including paths,
 * database settings, and MinIO configuration.
 */

import path from 'path';
import type { BackupType } from '@/types/backup';

/**
 * Backup system version
 * Update this when making breaking changes to backup format
 */
export const BACKUP_SCHEMA_VERSION = '1.0';

/**
 * Application information
 */
export const APP_INFO = {
  name: 'espacio-mvp',
  version: process.env.npm_package_version || '1.0.0',
};

/**
 * Root directory for all backups
 * By default, uses 'backups' directory in project root
 */
export const BACKUP_ROOT_DIR = process.env.BACKUP_ROOT_DIR || 
  path.join(process.cwd(), 'backups');

/**
 * Get backup directory path for a specific type
 */
export function getBackupTypeDir(type: BackupType): string {
  return path.join(BACKUP_ROOT_DIR, type);
}

/**
 * Temporary directory for backup operations
 */
export const TEMP_DIR = process.env.BACKUP_TEMP_DIR ||
  path.join(process.cwd(), 'tmp', 'backups');

/**
 * PostgreSQL connection configuration
 * Parsed from DATABASE_URL environment variable
 */
export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  containerName?: string;
}

/**
 * Parse PostgreSQL connection details from DATABASE_URL
 */
export function parsePostgresConfig(): PostgresConfig {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Try parsing as URL
    const url = new URL(databaseUrl);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1).split('?')[0], // Remove leading / and query params
      user: url.username,
      password: url.password,
      containerName: process.env.POSTGRES_CONTAINER,
    };
  } catch (error) {
    // Fallback to individual env vars
    return {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'startup_mvp',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      containerName: process.env.POSTGRES_CONTAINER,
    };
  }
}


/**
 * Backup file naming configuration
 */
export const BACKUP_FILENAME_PATTERN = /^backup-\d{8}-\d{6}\.zip(\.encrypted)?$/;

/**
 * Generate a backup ID with current timestamp
 * Format: backup-YYYYMMDD-HHMMSS
 */
export function generateBackupId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `backup-${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Generate filename for a backup
 */
export function generateBackupFilename(): string {
  return `${generateBackupId()}.zip`;
}

/**
 * Validate backup ID format
 */
export function isValidBackupId(id: string): boolean {
  return /^backup-\d{8}-\d{6}$/.test(id);
}

/**
 * Extract backup ID from filename
 */
export function extractBackupId(filename: string): string | null {
  const match = filename.match(/^(backup-\d{8}-\d{6})(\.zip|\.zip\.encrypted)$/);
  return match ? match[1] : null;
}

/**
 * Compression settings for ZIP files
 */
export const COMPRESSION_CONFIG = {
  algorithm: 'deflate' as const,
  level: 6, // Balanced between speed and compression ratio (0-9)
};

/**
 * Backup constraints
 */
export const BACKUP_CONSTRAINTS = {
  /** Maximum backup file size in bytes (2GB) */
  maxFileSize: 2 * 1024 * 1024 * 1024,
  
  /** Maximum upload file size in bytes (2GB) */
  maxUploadSize: 2 * 1024 * 1024 * 1024,
  
  /** Minimum free disk space required (1GB) */
  minFreeDiskSpace: 1 * 1024 * 1024 * 1024,
};

/**
 * Metadata file name within ZIP
 */
export const METADATA_FILENAME = 'metadata.json';

/**
 * Database dump file name within ZIP
 */
export const DATABASE_DUMP_FILENAME = 'database.dump';

/**
 * Files directory name within full backup ZIP
 */
export const FILES_DIRECTORY_NAME = 'files';

/**
 * Progress update interval for long operations (milliseconds)
 */
export const PROGRESS_UPDATE_INTERVAL = 500;

/**
 * SSE keep-alive interval (milliseconds)
 */
export const SSE_KEEPALIVE_INTERVAL = 30000;

/**
 * Restore operation timeout (milliseconds) - 1 hour
 */
export const RESTORE_TIMEOUT = 60 * 60 * 1000;

/**
 * Backup listing cache duration (milliseconds) - 5 seconds
 */
export const BACKUP_LIST_CACHE_DURATION = 5000;

