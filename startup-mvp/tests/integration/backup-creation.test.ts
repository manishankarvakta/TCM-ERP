/**
 * Integration Tests for Backup Creation with Encryption
 * 
 * Run with: tsx tests/integration/backup-creation.test.ts
 * 
 * Tests cover:
 * - Encrypted backup creation workflow
 * - Metadata file creation
 * - File system operations
 * - Error handling
 */

import { promises as fs } from "fs";
import path from "path";
import {
  createDatabaseBackup,
  createFilesBackup,
  createFullBackup,
  listBackups,
  getBackupTypeDir,
  ensureBackupDirs,
  type BackupType,
} from "../../lib/backup";
import {
  loadBackupMetadata,
  isEncryptedBackup,
  getEncryptedBackupPath,
} from "../../lib/backup-metadata";
import {
  isEncryptionEnabled,
  decryptBackupFile,
  verifyChecksum,
} from "../../lib/backup-encryption";

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
const testBackups: string[] = []; // Track created backups for cleanup

function test(name: string, fn: () => void | Promise<void>): void {
  const startTime = Date.now();
  const result = fn();
  if (result instanceof Promise) {
    result
      .then(() => {
        const duration = Date.now() - startTime;
        results.push({ name, passed: true, duration });
        console.log(`✅ ${name} (${duration}ms)`);
      })
      .catch((error) => {
        const duration = Date.now() - startTime;
        results.push({ name, passed: false, error: error.message, duration });
        console.error(`❌ ${name}: ${error.message} (${duration}ms)`);
      });
  } else {
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  }
}

async function cleanup() {
  console.log("\n🧹 Cleaning up test backups...");
  for (const backupPath of testBackups) {
    try {
      await fs.unlink(backupPath);
      // Also try to delete metadata
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
  console.log("🧪 Starting Backup Creation Integration Tests\n");
  console.log(`Encryption Enabled: ${isEncryptionEnabled()}\n`);

  // Set encryption key for testing
  process.env.BACKUP_ENCRYPTION_KEY = TEST_KEY;
  process.env.BACKUP_ENCRYPTION_ENABLED = "true";

  // ============================================
  // Setup Tests
  // ============================================
  console.log("📋 Setup Tests\n");

  test("ensureBackupDirs creates required directories", async () => {
    await ensureBackupDirs();
    const types: BackupType[] = ["database", "files", "full"];
    for (const type of types) {
      const dir = getBackupTypeDir(type);
      try {
        await fs.access(dir);
      } catch {
        throw new Error(`Directory ${dir} was not created`);
      }
    }
  });

  // ============================================
  // Database Backup Creation Tests
  // ============================================
  console.log("\n📋 Database Backup Creation Tests\n");

  test("createDatabaseBackup creates encrypted backup when enabled", async () => {
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // Check if encrypted file exists
    const isEncrypted = isEncryptedBackup(backupPath);
    if (!isEncrypted) {
      throw new Error("Backup was not encrypted");
    }

    // Check if metadata exists
    const metadata = await loadBackupMetadata(backupPath);
    if (!metadata || !metadata.encrypted) {
      throw new Error("Metadata not found or backup not marked as encrypted");
    }

    // Verify metadata fields
    if (!metadata.iv || !metadata.salt || !metadata.authTag || !metadata.checksum) {
      throw new Error("Metadata missing required encryption fields");
    }
  });

  test("encrypted database backup can be decrypted", async () => {
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    const metadata = await loadBackupMetadata(backupPath);
    if (!metadata || !metadata.encrypted || !metadata.iv || !metadata.salt || !metadata.authTag) {
      throw new Error("Invalid metadata");
    }

    // Read encrypted file
    const encryptedData = await fs.readFile(backupPath);
    const AUTH_TAG_LENGTH = 16;
    const encryptedContent = encryptedData.slice(0, -AUTH_TAG_LENGTH);

    // Decrypt
    const decrypted = await decryptBackupFile(
      encryptedContent,
      metadata.iv,
      metadata.salt,
      metadata.authTag,
      TEST_KEY
    );

    // Verify checksum
    if (metadata.checksum) {
      const isValid = verifyChecksum(decrypted, metadata.checksum);
      if (!isValid) {
        throw new Error("Checksum verification failed");
      }
    }

    // Verify it's valid SQL
    const sqlContent = decrypted.toString("utf-8");
    if (!sqlContent.includes("Database Backup")) {
      throw new Error("Decrypted content is not valid SQL");
    }
  });

  test("encrypted database backup metadata is correct", async () => {
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    const metadata = await loadBackupMetadata(backupPath);
    if (!metadata) {
      throw new Error("Metadata not found");
    }

    // Verify metadata structure
    if (metadata.type !== "database") {
      throw new Error(`Wrong backup type: ${metadata.type}`);
    }
    if (!metadata.encrypted) {
      throw new Error("Backup not marked as encrypted");
    }
    if (metadata.encryptionVersion !== 1) {
      throw new Error(`Wrong encryption version: ${metadata.encryptionVersion}`);
    }
    if (!metadata.createdAt) {
      throw new Error("CreatedAt timestamp missing");
    }
  });

  // ============================================
  // Files Backup Creation Tests
  // ============================================
  console.log("\n📋 Files Backup Creation Tests\n");

  test("createFilesBackup creates encrypted backup when enabled", async () => {
    // Note: This test requires MinIO to be running
    // Skip if MinIO is not available
    try {
      const backupPath = await createFilesBackup();
      testBackups.push(backupPath);

      const isEncrypted = isEncryptedBackup(backupPath);
      if (!isEncrypted) {
        throw new Error("Backup was not encrypted");
      }

      const metadata = await loadBackupMetadata(backupPath);
      if (!metadata || !metadata.encrypted) {
        throw new Error("Metadata not found or backup not marked as encrypted");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("MinIO")) {
        console.log("⚠️  Skipping files backup test (MinIO not available)");
        return;
      }
      throw error;
    }
  });

  // ============================================
  // Full Backup Creation Tests
  // ============================================
  console.log("\n📋 Full Backup Creation Tests\n");

  test("createFullBackup creates encrypted backup when enabled", async () => {
    // Note: This test requires MinIO to be running
    try {
      const backupPath = await createFullBackup();
      testBackups.push(backupPath);

      const isEncrypted = isEncryptedBackup(backupPath);
      if (!isEncrypted) {
        throw new Error("Backup was not encrypted");
      }

      const metadata = await loadBackupMetadata(backupPath);
      if (!metadata || !metadata.encrypted) {
        throw new Error("Metadata not found or backup not marked as encrypted");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("MinIO")) {
        console.log("⚠️  Skipping full backup test (MinIO not available)");
        return;
      }
      throw error;
    }
  });

  // ============================================
  // List Backups Tests
  // ============================================
  console.log("\n📋 List Backups Tests\n");

  test("listBackups includes encryption status", async () => {
    // Create a backup first
    const backupPath = await createDatabaseBackup();
    testBackups.push(backupPath);

    // List backups
    const backups = await listBackups("database");
    
    // Find our backup
    const ourBackup = backups.find(b => b.path === backupPath);
    if (!ourBackup) {
      throw new Error("Created backup not found in list");
    }

    // Verify encryption status
    if (!ourBackup.encrypted) {
      throw new Error("Backup not marked as encrypted in list");
    }

    if (!ourBackup.checksum) {
      throw new Error("Checksum not included in backup metadata");
    }
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 5000));

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

