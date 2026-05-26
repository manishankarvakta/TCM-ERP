/**
 * Backup Encryption Service
 * Provides AES-256-GCM encryption for backup files
 * 
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Unique IV (Initialization Vector) per backup
 * - PBKDF2 key derivation for additional security
 * - SHA-256 checksum for integrity verification
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHash } from "crypto";

/**
 * Encryption configuration constants
 */
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM authentication tag
const PBKDF2_ITERATIONS = 100000; // Key derivation iterations
const PBKDF2_DIGEST = "sha256";

/**
 * Encrypted backup structure
 */
export interface EncryptedBackup {
  encryptedData: Buffer;
  iv: string; // Base64 encoded IV
  salt: string; // Base64 encoded salt (for key derivation)
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Encryption result with metadata
 */
export interface EncryptionResult {
  encryptedBuffer: Buffer;
  iv: string;
  salt: string;
  authTag: string;
  checksum: string; // SHA-256 of original data
  originalSize: number;
  encryptedSize: number;
}

/**
 * Get encryption key from environment variable
 * @returns Encryption key as Buffer
 * @throws Error if key is not configured or invalid
 */
export function getEncryptionKey(): Buffer {
  const keyString = process.env.BACKUP_ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY environment variable is not set. " +
      "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // Validate key format (should be 64 hex characters = 32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(keyString)) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes). " +
      "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  return Buffer.from(keyString, "hex");
}

/**
 * Check if encryption is enabled
 * @returns true if encryption should be used
 */
export function isEncryptionEnabled(): boolean {
  const enabled = process.env.BACKUP_ENCRYPTION_ENABLED;
  const keyExists = !!process.env.BACKUP_ENCRYPTION_KEY;
  // Only enable if explicitly set to "true" AND key exists
  return enabled === "true" && keyExists;
}

/**
 * Generate a new encryption key
 * @returns 64-character hexadecimal string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("hex");
}

/**
 * Validate encryption key format
 * @param key - Key to validate
 * @returns true if key is valid
 */
export function validateEncryptionKey(key: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Derive encryption key from master key using PBKDF2
 * This adds an extra layer of security by using key derivation
 * @param masterKey - Master encryption key
 * @param salt - Salt for key derivation
 * @returns Derived key as Buffer
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Calculate SHA-256 checksum of data
 * @param data - Data to checksum
 * @returns Hexadecimal checksum string
 */
export function calculateChecksum(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Encrypt backup file data
 * 
 * Process:
 * 1. Generate random IV (Initialization Vector) for this backup
 * 2. Generate random salt for key derivation
 * 3. Derive encryption key from master key using PBKDF2
 * 4. Encrypt data using AES-256-GCM
 * 5. Calculate checksum of original data
 * 6. Return encrypted data with IV, salt, and auth tag
 * 
 * @param data - Original backup data to encrypt
 * @param masterKey - Optional master key (uses env var if not provided)
 * @returns Encryption result with encrypted data and metadata
 * @throws Error if encryption fails
 */
export async function encryptBackupFile(
  data: Buffer,
  masterKey?: string
): Promise<EncryptionResult> {
  try {
    // Get master key
    const keyBuffer = masterKey 
      ? Buffer.from(masterKey, "hex")
      : getEncryptionKey();

    // Validate master key
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
    }

    // Generate unique IV for this backup (never reuse IVs with same key!)
    const iv = randomBytes(IV_LENGTH);
    
    // Generate salt for key derivation
    const salt = randomBytes(SALT_LENGTH);

    // Derive encryption key from master key
    const derivedKey = deriveKey(keyBuffer, salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, derivedKey, iv);

    // Encrypt data
    const encryptedChunks: Buffer[] = [];
    encryptedChunks.push(cipher.update(data));
    encryptedChunks.push(cipher.final());

    // Get authentication tag (proves data integrity)
    const authTag = cipher.getAuthTag();

    // Combine encrypted chunks
    const encryptedData = Buffer.concat(encryptedChunks);

    // Calculate checksum of original data (for integrity verification)
    const checksum = calculateChecksum(data);

    return {
      encryptedBuffer: encryptedData,
      iv: iv.toString("base64"),
      salt: salt.toString("base64"),
      authTag: authTag.toString("base64"),
      checksum,
      originalSize: data.length,
      encryptedSize: encryptedData.length + authTag.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to encrypt backup: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt backup file data
 * 
 * Process:
 * 1. Decode IV, salt, and auth tag from base64
 * 2. Derive encryption key from master key using PBKDF2
 * 3. Decrypt data using AES-256-GCM
 * 4. Verify authentication tag (ensures data wasn't tampered)
 * 5. Return decrypted data
 * 
 * @param encryptedData - Encrypted backup data
 * @param iv - Base64 encoded IV used for encryption
 * @param salt - Base64 encoded salt used for key derivation
 * @param authTag - Base64 encoded authentication tag
 * @param masterKey - Optional master key (uses env var if not provided)
 * @returns Decrypted data as Buffer
 * @throws Error if decryption fails or authentication fails
 */
export async function decryptBackupFile(
  encryptedData: Buffer,
  iv: string,
  salt: string,
  authTag: string,
  masterKey?: string
): Promise<Buffer> {
  try {
    // Get master key
    const keyBuffer = masterKey
      ? Buffer.from(masterKey, "hex")
      : getEncryptionKey();

    // Validate master key
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters)`);
    }

    // Decode IV, salt, and auth tag
    const ivBuffer = Buffer.from(iv, "base64");
    const saltBuffer = Buffer.from(salt, "base64");
    const authTagBuffer = Buffer.from(authTag, "base64");

    // Validate lengths
    if (ivBuffer.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${ivBuffer.length}`);
    }
    if (saltBuffer.length !== SALT_LENGTH) {
      throw new Error(`Invalid salt length: expected ${SALT_LENGTH} bytes, got ${saltBuffer.length}`);
    }
    if (authTagBuffer.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTagBuffer.length}`);
    }

    // Derive encryption key from master key (must use same salt as encryption)
    const derivedKey = deriveKey(keyBuffer, saltBuffer);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, derivedKey, ivBuffer);
    decipher.setAuthTag(authTagBuffer); // Set auth tag for verification

    // Decrypt data
    const decryptedChunks: Buffer[] = [];
    decryptedChunks.push(decipher.update(encryptedData));
    decryptedChunks.push(decipher.final()); // This will throw if auth tag is invalid

    // Combine decrypted chunks
    return Buffer.concat(decryptedChunks);
  } catch (error) {
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Unsupported state") || error.message.includes("bad decrypt")) {
        throw new Error(
          "Decryption failed: Invalid encryption key or corrupted/tampered data. " +
          "The backup may have been encrypted with a different key or authentication failed."
        );
      }
      if (error.message.includes("auth tag")) {
        throw new Error(
          "Authentication failed: Backup data may have been tampered with or corrupted."
        );
      }
      throw new Error(`Failed to decrypt backup: ${error.message}`);
    }
    throw new Error("Failed to decrypt backup: Unknown error");
  }
}

/**
 * Verify checksum of decrypted data
 * @param data - Decrypted data
 * @param expectedChecksum - Expected SHA-256 checksum
 * @returns true if checksum matches
 */
export function verifyChecksum(data: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(data);
  return actualChecksum === expectedChecksum.toLowerCase();
}


