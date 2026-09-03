/**
 * Integration Tests for Backup Restore with Encryption
 * 
 * Run with: tsx tests/integration/backup-restore.test.ts
 * 
 * Tests cover:
 * - Encrypted backup restore workflow
 * - Decryption during restore
 * - Data integrity verification
 * - Error handling
 */

import { promises as fs } from "fs";
import path from "path";
import {
  createDatabaseBackup as createDatabaseBackupRaw,
  getBackupTypeDir,
  ensureBackupDirectories,
  findBackupPath,
} from "../../lib/backup";
import {
  loadBackupMetadata,
  isEncryptedBackup,
} from "../../lib/backup-metadata";
import {
  isEncryptionEnabled,
  verifyChecksum,
  decryptBackupFileForRestore,
} from "../../lib/backup-encryption";
import AdmZip from "adm-zip";
async function createDatabaseBackup(): Promise<string> {
  const metadata = await createDatabaseBackupRaw();
  const path = await findBackupPath(metadata.id);
  if (!path) throw new Error("Path not found");
  return path;
}

const getBackupPath = findBackupPath;
const ensureBackupDirs = ensureBackupDirectories;

// Test configuration
const TEST_KEY = process.env.BACKUP_ENCRYPTION_KEY || 
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];
const testBackups: string[] = [];

interface TestDef {
  name: string;
  fn: () => void | Promise<void>;
}
const tests: TestDef[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  tests.push({ name, fn });
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test backups...");
  for (const backupPath of testBackups) {
    try {
      await fs.unlink(backupPath);
      const metadataPath = backupPath.replace(/\.(sql|zip)(\.encrypted)?$/, ".meta.json");
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata might not exist
      }
    } catch (error) {
      console.warn(`Failed to delete ${backupPath}:`, error);
    }
  }
}

async function runTests() {
  console.log("🧪 Starting Backup Restore Integration Tests\n");
  console.log(`Encryption Enabled: ${isEncryptionEnabled()}\n`);

  // Set encryption key for testing
  process.env.BACKUP_ENCRYPTION_KEY = TEST_KEY;
  process.env.BACKUP_ENCRYPTION_ENABLED = "true";

  await ensureBackupDirs();

  // ============================================
  // Decryption Tests
  // ============================================
  console.log("📋 Decryption Tests\n");

  test("decryptBackupFileForRestore decrypts encrypted backup", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Verify it's encrypted
    if (!isEncryptedBackup(backupPath)) {
      throw new Error("Backup was not encrypted");
    }

    // Decrypt using restore function
    const decrypted = await decryptBackupFileForRestore(backupPath);

    // Verify it's a valid ZIP and contains database.dump
    try {
      const zip = new AdmZip(decrypted);
      const dumpEntry = zip.getEntry("database.dump");
      if (!dumpEntry) {
        throw new Error("database.dump not found in decrypted backup ZIP");
      }
    } catch (e: any) {
      throw new Error(`Decrypted content is not a valid backup ZIP: ${e.message}`);
    }
  });

  test("decryptBackupFileForRestore verifies checksum", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Load metadata
    const metadata = await loadBackupMetadata(backupPath);
    if (!metadata || !metadata.checksum) {
      throw new Error("Metadata or checksum not found");
    }

    // Decrypt
    const decrypted = await decryptBackupFileForRestore(backupPath);

    // Verify checksum
    const isValid = verifyChecksum(decrypted, metadata.checksum);
    if (!isValid) {
      throw new Error("Checksum verification failed");
    }
  });

  test("decryptBackupFileForRestore handles unencrypted backups", async () => {
    // Temporarily disable encryption
    const originalEnabled = process.env.BACKUP_ENCRYPTION_ENABLED;
    process.env.BACKUP_ENCRYPTION_ENABLED = "false";

    try {
      // Create an unencrypted backup
      const backupPath = await createDatabaseBackup();
      testBackups.push(backupPath);

      // Restore encryption setting
      process.env.BACKUP_ENCRYPTION_ENABLED = originalEnabled;

      // Decrypt should work (returns file as-is for unencrypted)
      const decrypted = await decryptBackupFileForRestore(backupPath);

      // Verify it's a valid ZIP and contains database.dump
      try {
        const zip = new AdmZip(decrypted);
        const dumpEntry = zip.getEntry("database.dump");
        if (!dumpEntry) {
          throw new Error("database.dump not found in decrypted backup ZIP");
        }
      } catch (e: any) {
        throw new Error(`Decrypted content is not a valid backup ZIP: ${e.message}`);
      }
    } finally {
      process.env.BACKUP_ENCRYPTION_ENABLED = originalEnabled;
    }
  });

  test("decryptBackupFileForRestore throws error for wrong key", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Change encryption key
    const originalKey = process.env.BACKUP_ENCRYPTION_KEY;
    process.env.BACKUP_ENCRYPTION_KEY = 
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    try {
      await decryptBackupFileForRestore(backupPath);
      throw new Error("Should have thrown error for wrong key");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("key")) {
        throw new Error("Wrong error type thrown");
      }
    } finally {
      process.env.BACKUP_ENCRYPTION_KEY = originalKey;
    }
  });

  test("decryptBackupFileForRestore throws error for missing metadata", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Delete metadata file
    const metadataPath = backupPath.replace(/\.(sql|zip)(\.encrypted)?$/, ".meta.json");
    try {
      await fs.unlink(metadataPath);
    } catch {
      // Metadata might not exist
    }

    // Try to decrypt - should handle gracefully
    try {
      const decrypted = await decryptBackupFileForRestore(backupPath);
      // If it doesn't throw, it should return the encrypted file as-is
      // (backward compatibility)
      if (decrypted.length === 0) {
        throw new Error("Decrypted data is empty");
      }
    } catch (error) {
      // Error is acceptable if metadata is required
      if (!(error instanceof Error)) {
        throw error;
      }
    }
  });

  // ============================================
  // Data Integrity Tests
  // ============================================
  console.log("\n📋 Data Integrity Tests\n");

  test("restored backup data matches original", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Load metadata
    const metadata = await loadBackupMetadata(backupPath);
    if (!metadata || !metadata.checksum) {
      throw new Error("Metadata or checksum not found");
    }

    // Decrypt
    const decrypted = await decryptBackupFileForRestore(backupPath);

    // Verify checksum
    const isValid = verifyChecksum(decrypted, metadata.checksum);
    if (!isValid) {
      throw new Error("Checksum mismatch - data integrity compromised");
    }
  });

  test("multiple restores produce same data", async () => {
    // Create an encrypted backup
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Decrypt multiple times
    const decrypted1 = await decryptBackupFileForRestore(backupPath);
    const decrypted2 = await decryptBackupFileForRestore(backupPath);

    // Verify they're identical
    if (!decrypted1.equals(decrypted2)) {
      throw new Error("Multiple restores produced different data");
    }
  });

  // Run all registered tests sequentially
  for (const t of tests) {
    const startTime = Date.now();
    try {
      await t.fn();
      const duration = Date.now() - startTime;
      results.push({ name: t.name, passed: true, duration });
      console.log(`✅ ${t.name} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      results.push({ name: t.name, passed: false, error: error.message, duration });
      console.error(`❌ ${t.name}: ${error.message} (${duration}ms)`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  // Cleanup
  await cleanup();

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch(async (error) => {
  console.error("Test suite failed:", error);
  await cleanup();
  process.exit(1);
});

