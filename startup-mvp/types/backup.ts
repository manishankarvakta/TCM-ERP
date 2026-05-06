/**
 * Backup System Type Definitions
 * 
 * Comprehensive TypeScript types for the new backup system
 * with single ZIP architecture and embedded metadata.
 */

/**
 * Backup types supported by the system
 */
export type BackupType = 'database' | 'files' | 'full';

/**
 * Backup file status
 */
export type BackupStatus = 'valid' | 'corrupted' | 'unknown';

/**
 * Restore operation status
 */
export type RestoreStatus = 
  | 'IDLE'
  | 'VALIDATING'
  | 'PREPARING'
  | 'EXTRACTING'
  | 'RESTORING_DATABASE'
  | 'RESTORING_FILES'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED';

/**
 * Compression level for backup creation
 */
export type CompressionLevel = 'none' | 'fast' | 'best';

/**
 * Complete backup metadata structure embedded in ZIP files
 */
export interface BackupMetadata {
  /** Unique backup identifier (format: backup-YYYYMMDD-HHMMSS) */
  id: string;
  
  /** Backup type */
  type: BackupType;
  
  /** ISO 8601 timestamp when backup was created */
  timestamp: string;
  
  /** Total size of backup file in bytes */
  size: number;
  
  /** Whether backup is encrypted (future feature) */
  encrypted: boolean;
  
  /** SHA-256 checksum of backup contents (format: "sha256:...") */
  checksum: string;
  
  /** Metadata schema version for future compatibility */
  version: string;
  
  /** Application information */
  application: {
    name: string;
    version: string;
  };
  
  /** Database backup statistics (if type is 'database' or 'full') */
  database?: {
    /** Size of database dump in bytes */
    size: number;
    /** pg_dump format used */
    format: 'custom';
    /** List of tables backed up */
    tables: string[];
    /** Approximate record count */
    recordCount?: number;
  };
  
  /** Files backup statistics (if type is 'files' or 'full') */
  files?: {
    /** Number of files backed up */
    count: number;
    /** Total size of all files in bytes */
    totalSize: number;
  };
  
  /** Compression settings */
  compression: {
    algorithm: 'deflate';
    level: number; // 0-9
  };
  
  /** Optional: User who created the backup */
  createdBy?: string;
  
  /** Optional: Description or notes */
  description?: string;
}

/**
 * Backup list item with file information and metadata
 */
export interface BackupListItem {
  /** Extracted backup metadata */
  metadata: BackupMetadata;
  
  /** Full file system path to backup ZIP */
  filePath: string;
  
  /** Backup filename */
  fileName: string;
  
  /** Backup validation status */
  status: BackupStatus;
  
  /** File modification time */
  modifiedAt: Date;
  
  /** Actual file size on disk (may differ from metadata.size) */
  fileSize: number;
}

/**
 * Real-time restore progress information
 */
export interface RestoreProgress {
  /** Unique restore operation identifier */
  restoreId: string;
  
  /** Current restore status */
  status: RestoreStatus;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Human-readable stage description */
  stage: string;
  
  /** Detailed operation logs with timestamps */
  logs: string[];
  
  /** When restore operation started */
  startTime: string;
  
  /** Estimated completion time (null if unknown) */
  estimatedCompletion: string | null;
  
  /** Restore statistics */
  stats: {
    /** Tables processed (for database restores) */
    tablesProcessed?: number;
    /** Total tables to process */
    tablesTotal?: number;
    /** Files restored (for files restores) */
    filesUploaded?: number;
    /** Total files to restore */
    filesTotal?: number;
    /** Bytes processed */
    bytesProcessed?: number;
    /** Total bytes to process */
    bytesTotal?: number;
  };
  
  /** Current file/table being processed */
  currentItem?: string;
  
  /** Error message if restore failed */
  error?: string | null;
  
  /** Stack trace for debugging (only in development) */
  errorDetails?: string;
}

/**
 * Options for backup creation
 */
export interface BackupCreationOptions {
  /** Type of backup to create */
  type: BackupType;
  
  /** Enable encryption (future feature) */
  encrypt?: boolean;
  
  /** Compression level */
  compression?: CompressionLevel;
  
  /** Optional description */
  description?: string;
  
  /** Include specific tables only (database backups) */
  includeTables?: string[];
  
  /** Exclude specific tables (database backups) */
  excludeTables?: string[];
}

/**
 * Options for restore operations
 */
export interface RestoreOptions {
  /** Backup ID to restore from */
  backupId: string;
  
  /** Create a pre-restore backup before starting */
  createPreRestoreBackup?: boolean;
  
  /** Skip checksum verification (not recommended) */
  skipVerification?: boolean;
  
  /** Drop existing database objects before restore */
  cleanDatabase?: boolean;
  
  /** Clear local files before restore */
  clearFiles?: boolean;
}

/**
 * Backup validation result
 */
export interface ValidationResult {
  /** Whether backup is valid */
  valid: boolean;
  
  /** Validation errors if any */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Checksum match result */
  checksumValid?: boolean;
  
  /** ZIP structure validation result */
  structureValid?: boolean;
  
  /** Metadata validation result */
  metadataValid?: boolean;
}

/**
 * API error response structure
 */
export interface ApiError {
  /** User-friendly error message */
  error: string;
  
  /** Error code for programmatic handling */
  code: string;
  
  /** Technical details for debugging */
  details?: string;
  
  /** Whether the operation can be retried */
  retryable?: boolean;
}

/**
 * API success response wrapper
 */
export interface ApiSuccess<T = unknown> {
  /** Success flag */
  success: true;
  
  /** Response data */
  data: T;
  
  /** Optional message */
  message?: string;
}

/**
 * API error response wrapper
 */
export interface ApiErrorResponse {
  /** Success flag */
  success: false;
  
  /** Error details */
  error: ApiError;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiErrorResponse;

/**
 * Backup creation response
 */
export interface BackupCreationResponse {
  /** Created backup metadata */
  metadata: BackupMetadata;
  
  /** File path where backup was created */
  filePath: string;
  
  /** Time taken to create backup (milliseconds) */
  duration: number;
}

/**
 * Backup list response
 */
export interface BackupListResponse {
  /** List of all backups */
  backups: BackupListItem[];
  
  /** Total count */
  total: number;
  
  /** Count by type */
  byType: {
    database: number;
    files: number;
    full: number;
  };
}

/**
 * Restore initiation response
 */
export interface RestoreInitiationResponse {
  /** Unique restore operation ID for progress tracking */
  restoreId: string;
  
  /** SSE endpoint URL for progress updates */
  progressUrl: string;
}

/**
 * Type guard for checking if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Type guard for checking if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Type guard for BackupType
 */
export function isBackupType(value: string): value is BackupType {
  return value === 'database' || value === 'files' || value === 'full';
}

/**
 * Type guard for RestoreStatus
 */
export function isRestoreStatus(value: string): value is RestoreStatus {
  const validStatuses: RestoreStatus[] = [
    'IDLE', 'VALIDATING', 'PREPARING', 'EXTRACTING',
    'RESTORING_DATABASE', 'RESTORING_FILES', 'VERIFYING',
    'COMPLETED', 'FAILED'
  ];
  return validStatuses.includes(value as RestoreStatus);
}

/**
 * Error codes for backup operations
 */
export enum BackupErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Backup creation errors
  BACKUP_CREATION_FAILED = 'BACKUP_CREATION_FAILED',
  DATABASE_DUMP_FAILED = 'DATABASE_DUMP_FAILED',
  FILES_BACKUP_FAILED = 'FILES_BACKUP_FAILED',
  DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
  
  // Backup listing errors
  BACKUP_NOT_FOUND = 'BACKUP_NOT_FOUND',
  BACKUP_LISTING_FAILED = 'BACKUP_LISTING_FAILED',
  
  // Upload errors
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_BACKUP_FILE = 'INVALID_BACKUP_FILE',
  
  // Restore errors
  RESTORE_FAILED = 'RESTORE_FAILED',
  RESTORE_IN_PROGRESS = 'RESTORE_IN_PROGRESS',
  DATABASE_RESTORE_FAILED = 'DATABASE_RESTORE_FAILED',
  FILES_RESTORE_FAILED = 'FILES_RESTORE_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  
  // Connection errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  STORAGE_CONNECTION_FAILED = 'STORAGE_CONNECTION_FAILED',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IO_ERROR = 'IO_ERROR',
}

