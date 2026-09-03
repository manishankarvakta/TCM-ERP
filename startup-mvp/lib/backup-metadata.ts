import { extractMetadataFromZip } from "./backup/metadata";
import type { BackupMetadata } from "@/types/backup";

import { isEncryptionEnabled, decryptBackupFileForRestore, calculateChecksum } from "./backup-encryption";
import AdmZip from "adm-zip";

export async function loadBackupMetadata(zipPath: string): Promise<any> {
  if (isEncryptionEnabled()) {
    try {
      const decryptedBuffer = await decryptBackupFileForRestore(zipPath);
      const zip = new AdmZip(decryptedBuffer);
      const metadataEntry = zip.getEntry("metadata.json");
      if (metadataEntry) {
        const metadata = JSON.parse(zip.readAsText(metadataEntry));
        const fs = require("fs");
        const fileContent = fs.readFileSync(zipPath);
        const iv = fileContent.subarray(0, 12);
        const authTag = fileContent.subarray(12, 28);
        metadata.iv = iv.toString("hex");
        metadata.salt = iv.toString("hex");
        metadata.authTag = authTag.toString("hex");
        metadata.checksum = "sha256:" + calculateChecksum(decryptedBuffer);
        metadata.encrypted = true;
        metadata.encryptionVersion = 1;
        metadata.createdAt = metadata.timestamp || new Date().toISOString();
        return metadata;
      }
    } catch (e: any) {
      console.log("!!! loadBackupMetadata decryption error:", e.message, e.stack);
    }
  }
  return extractMetadataFromZip(zipPath);
}

export function isEncryptedBackup(metadata: any): boolean {
  if (typeof metadata === "string") return true;
  return metadata?.encrypted || false;
}

export function getEncryptedBackupPath(originalPath: string): string {
  return originalPath + ".enc";
}
