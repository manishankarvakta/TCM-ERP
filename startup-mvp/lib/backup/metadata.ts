/**
 * Backup Metadata Operations
 * 
 * Functions for extracting, validating, and managing
 * backup metadata within ZIP files.
 */

import { promises as fs } from 'fs';
import JSZip from 'jszip';
import type { BackupMetadata, BackupType } from '@/types/backup';
import {
  METADATA_FILENAME,
  BACKUP_SCHEMA_VERSION,
  APP_INFO,
  COMPRESSION_CONFIG,
} from './config';
import { formatTimestamp, generateBackupId } from './utils';

/**
 * Extract metadata from a ZIP backup file
 * @param zipPath - Path to ZIP file
 * @returns Parsed backup metadata
 * @throws Error if metadata cannot be extracted or parsed
 */
export async function extractMetadataFromZip(zipPath: string): Promise<BackupMetadata> {
  try {
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    const metadataFile = zip.file(METADATA_FILENAME);

    if (!metadataFile) {
      throw new Error(`Metadata file '${METADATA_FILENAME}' not found in backup ZIP`);
    }

    const metadataContent = await metadataFile.async('string');
    
    if (!metadataContent) {
      throw new Error('Metadata file is empty');
    }

    const metadata = JSON.parse(metadataContent) as BackupMetadata;

    // Validate the extracted metadata
    const validationResult = validateMetadata(metadata);
    if (!validationResult.valid) {
      throw new Error(`Invalid metadata: ${validationResult.errors.join(', ')}`);
    }

    return metadata;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Metadata file contains invalid JSON');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(`Failed to extract metadata: ${String(error)}`);
  }
}

/**
 * Validation result structure
 */
interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate backup metadata structure and contents
 * @param metadata - Metadata object to validate
 * @returns Validation result with errors if any
 */
export function validateMetadata(metadata: any): MetadataValidationResult {
  const errors: string[] = [];

  // Check if metadata is an object
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, errors: ['Metadata is not an object'] };
  }

  // Required fields
  const requiredFields: Array<keyof BackupMetadata> = [
    'id',
    'type',
    'timestamp',
    'size',
    'encrypted',
    'checksum',
    'version',
  ];

  for (const field of requiredFields) {
    if (!(field in metadata)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate ID format
  if (metadata.id && !/^backup-\d{8}-\d{6}$/.test(metadata.id)) {
    errors.push('Invalid backup ID format');
  }

  // Validate type
  const validTypes: BackupType[] = ['database', 'files', 'full'];
  if (metadata.type && !validTypes.includes(metadata.type)) {
    errors.push(`Invalid backup type: ${metadata.type}`);
  }

  // Validate timestamp
  if (metadata.timestamp) {
    const date = new Date(metadata.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  // Validate size
  if (metadata.size !== undefined && (typeof metadata.size !== 'number' || metadata.size < 0)) {
    errors.push('Invalid size value');
  }

  // Validate encrypted flag
  if (metadata.encrypted !== undefined && typeof metadata.encrypted !== 'boolean') {
    errors.push('Invalid encrypted value');
  }

  // Validate checksum format
  if (metadata.checksum && !metadata.checksum.startsWith('sha256:')) {
    errors.push('Invalid checksum format (must start with "sha256:")');
  }

  // Validate database metadata if present
  if (metadata.database) {
    if (typeof metadata.database !== 'object') {
      errors.push('Invalid database metadata');
    } else {
      if (metadata.database.size !== undefined && typeof metadata.database.size !== 'number') {
        errors.push('Invalid database size');
      }
      if (metadata.database.tables && !Array.isArray(metadata.database.tables)) {
        errors.push('Invalid database tables array');
      }
    }
  }

  // Validate files metadata if present
  if (metadata.files) {
    if (typeof metadata.files !== 'object') {
      errors.push('Invalid files metadata');
    } else {
      if (metadata.files.count !== undefined && typeof metadata.files.count !== 'number') {
        errors.push('Invalid files count');
      }
      if (metadata.files.totalSize !== undefined && typeof metadata.files.totalSize !== 'number') {
        errors.push('Invalid files total size');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new backup metadata object
 * @param options - Partial metadata to customize
 * @returns Complete backup metadata object
 */
export function createMetadata(
  options: Partial<BackupMetadata> & { type: BackupType }
): BackupMetadata {
  const id = options.id || generateBackupId();
  const timestamp = options.timestamp || formatTimestamp();

  const metadata: BackupMetadata = {
    id,
    type: options.type,
    timestamp,
    size: options.size || 0,
    encrypted: options.encrypted || false,
    checksum: options.checksum || '',
    version: BACKUP_SCHEMA_VERSION,
    application: {
      name: APP_INFO.name,
      version: APP_INFO.version,
    },
    compression: {
      algorithm: COMPRESSION_CONFIG.algorithm,
      level: COMPRESSION_CONFIG.level,
    },
    ...( options.database && { database: options.database }),
    ...(options.files && { files: options.files }),
    ...(options.createdBy && { createdBy: options.createdBy }),
    ...(options.description && { description: options.description }),
  };

  return metadata;
}

/**
 * Add or update metadata in an existing ZIP file
 * @param zipPath - Path to ZIP file
 * @param metadata - Metadata to add/update
 * @throws Error if operation fails
 */
export async function addMetadataToZip(
  zipPath: string,
  metadata: BackupMetadata
): Promise<void> {
  try {
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);

    // Validate metadata before adding
    const validationResult = validateMetadata(metadata);
    if (!validationResult.valid) {
      throw new Error(`Invalid metadata: ${validationResult.errors.join(', ')}`);
    }

    // Convert metadata to JSON string
    const metadataJson = JSON.stringify(metadata, null, 2);

    // Add or overwrite metadata
    zip.file(METADATA_FILENAME, metadataJson);

    // Generate updated ZIP buffer and write it
    const updatedZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(zipPath, updatedZipBuffer);
  } catch (error) {
    throw new Error(
      `Failed to add metadata to ZIP: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if a ZIP file contains valid backup metadata
 * @param zipPath - Path to ZIP file
 * @returns True if backup contains valid metadata
 */
export async function hasValidMetadata(zipPath: string): Promise<boolean> {
  try {
    const metadata = await extractMetadataFromZip(zipPath);
    return validateMetadata(metadata).valid;
  } catch {
    return false;
  }
}

/**
 * Get backup type from metadata without full extraction
 * Faster than extractMetadataFromZip for quick type checks
 * @param zipPath - Path to ZIP file
 * @returns Backup type or null if cannot be determined
 */
export async function getBackupType(zipPath: string): Promise<BackupType | null> {
  try {
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    const metadataFile = zip.file(METADATA_FILENAME);

    if (!metadataFile) {
      return null;
    }

    const metadataContent = await metadataFile.async('string');
    const metadata = JSON.parse(metadataContent);

    if (metadata && metadata.type) {
      const validTypes: BackupType[] = ['database', 'files', 'full'];
      return validTypes.includes(metadata.type) ? metadata.type : null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Update metadata checksum
 * @param metadata - Metadata object to update
 * @param checksum - New checksum value
 * @returns Updated metadata
 */
export function updateMetadataChecksum(
  metadata: BackupMetadata,
  checksum: string
): BackupMetadata {
  return {
    ...metadata,
    checksum,
  };
}

/**
 * Update metadata size
 * @param metadata - Metadata object to update
 * @param size - New size value in bytes
 * @returns Updated metadata
 */
export function updateMetadataSize(
  metadata: BackupMetadata,
  size: number
): BackupMetadata {
  return {
    ...metadata,
    size,
  };
}

