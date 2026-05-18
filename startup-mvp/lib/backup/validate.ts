/**
 * Backup Validation Functions
 * 
 * Functions for validating backup integrity and structure.
 */

import AdmZip from 'adm-zip';
import type { ValidationResult, BackupType } from '@/types/backup';
import {
  extractMetadataFromZip,
  validateMetadata,
  hasValidMetadata,
} from './metadata';
import {
  calculateFileChecksum,
  verifyFileChecksum,
  fileExists,
} from './utils';
import {
  METADATA_FILENAME,
  DATABASE_DUMP_FILENAME,
  FILES_DIRECTORY_NAME,
} from './config';

/**
 * Validate backup integrity including checksum, structure, and metadata
 * @param backupPath - Path to backup ZIP file
 * @returns Validation result with detailed errors and warnings
 */
export async function validateBackupIntegrity(backupPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if file exists
    if (!(await fileExists(backupPath))) {
      return {
        valid: false,
        errors: ['Backup file does not exist'],
        warnings: [],
        checksumValid: false,
        structureValid: false,
        metadataValid: false,
      };
    }

    // Extract and validate metadata
    let metadata;
    try {
      metadata = await extractMetadataFromZip(backupPath);
      
      const metadataValidation = validateMetadata(metadata);
      if (!metadataValidation.valid) {
        errors.push(...metadataValidation.errors);
      }
    } catch (error) {
      errors.push(`Metadata validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        errors,
        warnings,
        checksumValid: false,
        structureValid: false,
        metadataValid: false,
      };
    }

    // Validate ZIP structure
    const structureResult = await verifyZipStructure(backupPath, metadata.type);
    if (!structureResult.valid) {
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);
    }

    // Verify checksum if provided
    let checksumValid = false;
    if (metadata.checksum && metadata.checksum !== '') {
      try {
        checksumValid = await verifyFileChecksum(backupPath, metadata.checksum);
        if (!checksumValid) {
          errors.push('Checksum verification failed - backup file may be corrupted');
        }
      } catch (error) {
        warnings.push(`Checksum verification failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      warnings.push('No checksum provided - cannot verify file integrity');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checksumValid,
      structureValid: structureResult.valid,
      metadataValid: true,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings,
      checksumValid: false,
      structureValid: false,
      metadataValid: false,
    };
  }
}

/**
 * Verify ZIP structure based on backup type
 * @param zipPath - Path to ZIP file
 * @param type - Expected backup type
 * @returns Validation result
 */
export async function verifyZipStructure(
  zipPath: string,
  type: BackupType
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Check if ZIP is not empty
    if (entries.length === 0) {
      errors.push('Backup ZIP is empty');
      return { valid: false, errors, warnings };
    }

    // Check for metadata.json
    const hasMetadata = entries.some((entry: any) => entry.entryName === METADATA_FILENAME);
    if (!hasMetadata) {
      errors.push(`Missing ${METADATA_FILENAME} file`);
    }

    // Type-specific structure validation
    switch (type) {
      case 'database':
        // Should contain database.dump
        const hasDatabaseDump = entries.some(
          (entry: any) => entry.entryName === DATABASE_DUMP_FILENAME
        );
        if (!hasDatabaseDump) {
          errors.push(`Missing ${DATABASE_DUMP_FILENAME} file for database backup`);
        }
        
        // Should not contain files directory
        const hasFilesDir = entries.some(
          (entry: any) => entry.entryName.startsWith(FILES_DIRECTORY_NAME + '/')
        );
        if (hasFilesDir) {
          warnings.push('Database backup contains files directory (unexpected)');
        }
        break;

      case 'files':
        // Should contain files (other than metadata)
        const fileEntries = entries.filter(
          (entry: any) => entry.entryName !== METADATA_FILENAME && !entry.isDirectory
        );
        if (fileEntries.length === 0) {
          warnings.push('Files backup contains no files');
        }
        
        // Should not contain database.dump
        const hasDb = entries.some((entry: any) => entry.entryName === DATABASE_DUMP_FILENAME);
        if (hasDb) {
          warnings.push('Files backup contains database.dump (unexpected)');
        }
        break;

      case 'full':
        // Should contain both database.dump and files
        const hasDbDump = entries.some(
          (entry: any) => entry.entryName === DATABASE_DUMP_FILENAME
        );
        if (!hasDbDump) {
          errors.push(`Missing ${DATABASE_DUMP_FILENAME} file for full backup`);
        }

        const hasFiles = entries.some(
          (entry: any) =>
            entry.entryName !== METADATA_FILENAME &&
            entry.entryName !== DATABASE_DUMP_FILENAME &&
            !entry.isDirectory
        );
        if (!hasFiles) {
          warnings.push('Full backup contains no files');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to verify ZIP structure: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings,
    };
  }
}

/**
 * Calculate checksum of a backup file
 * @param filePath - Path to backup file
 * @returns Checksum in format "sha256:..."
 */
export async function calculateChecksum(filePath: string): Promise<string> {
  return await calculateFileChecksum(filePath);
}

/**
 * Quick validation check - just verify metadata exists and is valid
 * Much faster than full integrity check
 * @param zipPath - Path to ZIP file
 * @returns True if backup has valid metadata
 */
export async function quickValidate(zipPath: string): Promise<boolean> {
  try {
    return await hasValidMetadata(zipPath);
  } catch {
    return false;
  }
}

/**
 * Detect if a ZIP file is corrupted
 * @param zipPath - Path to ZIP file
 * @returns True if file appears to be corrupted
 */
export async function isCorrupted(zipPath: string): Promise<boolean> {
  try {
    // Try to open the ZIP
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // If we can't get entries, it's corrupted
    if (!entries) {
      return true;
    }

    // Try to read at least one entry
    if (entries.length > 0) {
      try {
        zip.readAsText(entries[0]);
      } catch {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Get detailed validation information for display
 * @param backupPath - Path to backup file
 * @returns Human-readable validation details
 */
export async function getValidationDetails(backupPath: string): Promise<{
  isValid: boolean;
  message: string;
  details: string[];
}> {
  const result = await validateBackupIntegrity(backupPath);

  let message = 'Backup is valid';
  const details: string[] = [];

  if (!result.valid) {
    message = 'Backup validation failed';
    details.push(...result.errors);
  }

  if (result.warnings.length > 0) {
    if (result.valid) {
      message = 'Backup is valid with warnings';
    }
    details.push(...result.warnings);
  }

  if (result.checksumValid === false) {
    details.push('⚠️ Checksum mismatch - file may be corrupted');
  } else if (result.checksumValid === true) {
    details.push('✓ Checksum verified');
  }

  if (result.structureValid === false) {
    details.push('⚠️ ZIP structure validation failed');
  } else if (result.structureValid === true) {
    details.push('✓ ZIP structure is correct');
  }

  if (result.metadataValid === false) {
    details.push('⚠️ Metadata validation failed');
  } else if (result.metadataValid === true) {
    details.push('✓ Metadata is valid');
  }

  return {
    isValid: result.valid,
    message,
    details,
  };
}

