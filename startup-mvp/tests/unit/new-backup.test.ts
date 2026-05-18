/**
 * Unit/Integration Tests for New Local Storage Backup System
 * 
 * Run with: tsx tests/unit/new-backup.test.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { createDatabaseBackup, createFilesBackup, createFullBackup } from "../../lib/backup/create";
import { listAllBackups } from "../../lib/backup/list";
import { validateBackupIntegrity } from "../../lib/backup/validate";
import { restoreFilesBackup } from "../../lib/backup/restore";
import { getRestoreManager } from "../../lib/backup/restore-manager";
import { storage } from "../../lib/storage";
import { getBackupTypeDir } from "../../lib/backup/config";
import { promises as fs } from "fs";
import path from "path";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage, duration });
    console.error(`❌ ${name}: ${errorMessage} (${duration}ms)`);
  }
}

async function runTests() {
  console.log("🧪 Starting New Local Storage Backup System Integration Tests\n");

  // Ensure env variables are set for testing
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "volumes/uploads");
  await fs.mkdir(process.env.UPLOAD_DIR, { recursive: true });

  // 1. Create a dummy file in local storage upload directory
  console.log("📋 Preparing test file in uploads directory...\n");
  const testFileName = `test-file-${Date.now()}.txt`;
  const testFileContent = "This is a test file for the Next.js local storage backup system integration test.";
  await storage.saveFile(testFileName, Buffer.from(testFileContent));
  console.log(`✅ Created test file: ${testFileName}\n`);

  // 2. Test Backup Creation
  console.log("📋 Running Backup Creation Tests...\n");

  let dbBackupPath = "";
  await test("createDatabaseBackup creates a valid database backup ZIP", async () => {
    const backup = await createDatabaseBackup({
      type: "database",
      description: "Integration test database backup",
    });

    if (!backup.id) throw new Error("Backup ID is missing");
    if (backup.type !== "database") throw new Error("Expected type to be database");
    
    // Find expected path
    const expectedDir = getBackupTypeDir("database");
    dbBackupPath = path.join(expectedDir, `${backup.id}.zip`);
    
    const exists = await fs.stat(dbBackupPath).then(() => true).catch(() => false);
    if (!exists) throw new Error(`Backup file does not exist at expected path: ${dbBackupPath}`);
  });

  let filesBackupPath = "";
  await test("createFilesBackup creates a valid files backup ZIP", async () => {
    const backup = await createFilesBackup({
      type: "files",
      description: "Integration test files backup",
    });

    if (!backup.id) throw new Error("Backup ID is missing");
    if (backup.type !== "files") throw new Error("Expected type to be files");

    const expectedDir = getBackupTypeDir("files");
    filesBackupPath = path.join(expectedDir, `${backup.id}.zip`);

    const exists = await fs.stat(filesBackupPath).then(() => true).catch(() => false);
    if (!exists) throw new Error(`Backup file does not exist at expected path: ${filesBackupPath}`);
  });

  // 3. Test Backup Validation
  console.log("\n📋 Running Backup Validation Tests...\n");

  await test("validateBackupIntegrity validates the created database backup ZIP", async () => {
    if (!dbBackupPath) throw new Error("No database backup file to validate");
    const result = await validateBackupIntegrity(dbBackupPath);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join(", ")}`);
    }
  });

  await test("validateBackupIntegrity validates the created files backup ZIP", async () => {
    if (!filesBackupPath) throw new Error("No files backup file to validate");
    const result = await validateBackupIntegrity(filesBackupPath);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join(", ")}`);
    }
  });

  // 4. Test Backup Listing
  console.log("\n📋 Running Backup Listing Tests...\n");

  await test("listBackups returns created backups", async () => {
    const backups = await listAllBackups();
    if (backups.length === 0) {
      throw new Error("No backups returned from listAllBackups");
    }
    const hasDb = backups.some((b) => b.metadata.type === "database");
    const hasFiles = backups.some((b) => b.metadata.type === "files");
    if (!hasDb || !hasFiles) {
      throw new Error("Missing expected backup types in backup list");
    }
  });

  // 5. Test Restore Operation
  console.log("\n📋 Running Backup Restore Tests...\n");

  await test("restoreBackup successfully restores files backup", async () => {
    if (!filesBackupPath) throw new Error("No files backup file to restore");

    const filesBackupId = path.basename(filesBackupPath, ".zip");

    // Remove the original test file first to ensure the restore action brings it back
    await fs.unlink(path.join(process.env.UPLOAD_DIR!, testFileName)).catch(() => {});

    // Run restore
    const manager = getRestoreManager();
    const restoreId = manager.createRestore(filesBackupId);
    
    await restoreFilesBackup(filesBackupId, restoreId, {
      clearFiles: true,
    });

    const progress = manager.getProgress(restoreId);
    if (!progress || progress.status !== "COMPLETED") {
      throw new Error(`Restore failed: ${progress?.error || "Unknown error"}`);
    }

    // Verify file is restored
    const restoredContent = await storage.readFile(testFileName).then((b) => b.toString());
    if (restoredContent !== testFileContent) {
      throw new Error(`Restored content mismatch: expected "${testFileContent}", got "${restoredContent}"`);
    }
  });

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 New Backup System Test Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);

  // Clean up test file
  await fs.unlink(path.join(process.env.UPLOAD_DIR!, testFileName)).catch(() => {});

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n🎉 All integration tests passed successfully!");
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
