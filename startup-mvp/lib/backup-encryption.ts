import crypto from "crypto";
import fs from "fs";

export function isEncryptionEnabled(key?: string): boolean {
  return !!(key || process.env.BACKUP_ENCRYPTION_KEY);
}

export function getEncryptionKey(): string {
  return process.env.BACKUP_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function validateEncryptionKey(key: string): boolean {
  return typeof key === "string" && key.length === 64 && /^[0-9a-fA-F]+$/.test(key);
}

export function calculateChecksum(filePathOrBuffer: string | Buffer): string {
  const hash = crypto.createHash("sha256");
  if (Buffer.isBuffer(filePathOrBuffer)) {
    hash.update(filePathOrBuffer);
  } else {
    const data = fs.readFileSync(filePathOrBuffer);
    hash.update(data);
  }
  return hash.digest("hex");
}

export function verifyChecksum(filePathOrBuffer: string | Buffer, expectedChecksum: string): boolean {
  let cleanedExpected = expectedChecksum;
  if (expectedChecksum.startsWith("sha256:")) {
    cleanedExpected = expectedChecksum.substring(7);
  }
  const checksum = calculateChecksum(filePathOrBuffer);
  return checksum === cleanedExpected;
}

export interface EncryptionResult {
  encryptedContent: Buffer;
  encryptedBuffer: Buffer;
  iv: string;
  salt: string;
  authTag: string;
  checksum: string;
  originalSize: number;
}

export async function encryptBackupFile(
  dataOrSrcPath: Buffer | string,
  keyHexOrDestPath: string,
  keyHexForPath?: string
): Promise<any> {
  if (Buffer.isBuffer(dataOrSrcPath) || typeof dataOrSrcPath !== "string") {
    const data = Buffer.isBuffer(dataOrSrcPath) ? dataOrSrcPath : Buffer.from(dataOrSrcPath);
    const keyHex = keyHexOrDestPath;
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) throw new Error("Invalid key length");
    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encryptedContent = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      encryptedContent,
      encryptedBuffer: encryptedContent,
      iv: iv.toString("base64"),
      salt: salt.toString("base64"),
      authTag: authTag.toString("base64"),
      checksum: calculateChecksum(data),
      originalSize: data.length,
    };
  } else {
    const srcPath = dataOrSrcPath;
    const destPath = keyHexOrDestPath;
    const keyHex = keyHexForPath || getEncryptionKey();
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const input = await fs.promises.readFile(srcPath);
    const encryptedContent = Buffer.concat([cipher.update(input), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const finalBuffer = Buffer.concat([iv, authTag, encryptedContent]);
    await fs.promises.writeFile(destPath, finalBuffer);
  }
}

export async function decryptBackupFile(
  encryptedContentOrSrcPath: Buffer | string,
  ivHexOrDestPath: string,
  saltHexOrKeyHex?: string,
  authTagHex?: string,
  keyHex?: string
): Promise<any> {
  if (Buffer.isBuffer(encryptedContentOrSrcPath)) {
    const encryptedContent = encryptedContentOrSrcPath;
    const ivHex = ivHexOrDestPath;
    const authTagHexVal = authTagHex!;
    const keyHexVal = keyHex!;
    
    const key = Buffer.from(keyHexVal, "hex");
    if (key.length !== 32) throw new Error("Invalid key length");
    
    const iv = ivHex.length === 24 && /^[0-9a-fA-F]+$/.test(ivHex)
      ? Buffer.from(ivHex, "hex")
      : Buffer.from(ivHex, "base64");
      
    const authTag = authTagHexVal.length === 32 && /^[0-9a-fA-F]+$/.test(authTagHexVal)
      ? Buffer.from(authTagHexVal, "hex")
      : Buffer.from(authTagHexVal, "base64");
    
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: Invalid key or corrupted data. Original error: ${error.message}`);
    }
  } else {
    const srcPath = encryptedContentOrSrcPath;
    const destPath = ivHexOrDestPath;
    const keyHexVal = saltHexOrKeyHex || getEncryptionKey();
    
    const key = Buffer.from(keyHexVal, "hex");
    const data = await fs.promises.readFile(srcPath);
    
    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const encryptedContent = data.subarray(28);
    
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
      await fs.promises.writeFile(destPath, decrypted);
    } catch (error: any) {
      throw new Error(`Decryption failed: Invalid key or corrupted data. Original error: ${error.message}`);
    }
  }
}

export async function decryptBackupFileForRestore(filePath: string): Promise<Buffer> {
  const keyHex = getEncryptionKey();
  const data = await fs.promises.readFile(filePath);
  
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encryptedContent = data.subarray(28);
  
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: Invalid key or corrupted data. Original error: ${error.message}`);
  }
}
