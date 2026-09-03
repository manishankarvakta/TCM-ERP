import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("No integration/backup encryption key configured in environment");
  }
  
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("Encryption key must be exactly 32 bytes (64 hex characters)");
  }
  
  return key;
}

/**
 * Encrypt integration credentials
 * @param plaintext Plaintext credentials string (typically JSON)
 * @returns Base64 encoded string containing [iv(12B)][authTag(16B)][ciphertext]
 */
export function encryptCredentials(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypt integration credentials
 * @param encryptedBase64 Base64 encoded string containing [iv(12B)][authTag(16B)][ciphertext]
 * @returns Plaintext credentials string
 */
export function decryptCredentials(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const rawData = Buffer.from(encryptedBase64, "base64");
  
  if (rawData.length < 28) {
    throw new Error("Malformed encrypted credentials payload");
  }
  
  const iv = rawData.subarray(0, 12);
  const authTag = rawData.subarray(12, 28);
  const ciphertext = rawData.subarray(28);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  
  return decrypted.toString("utf8");
}
