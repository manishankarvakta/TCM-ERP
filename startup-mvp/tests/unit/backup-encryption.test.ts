/**
 * Unit Tests for Backup Encryption Module
 * 
 * Run with: tsx tests/unit/backup-encryption.test.ts
 * 
 * Tests cover:
 * - Key generation and validation
 * - Encryption/decryption operations
 * - Checksum calculation
 * - Error handling
 * - Edge cases
 */

import { 
  encryptBackupFile, 
  decryptBackupFile,
  generateEncryptionKey,
  validateEncryptionKey,
  calculateChecksum,
  verifyChecksum,
  getEncryptionKey,
  isEncryptionEnabled
} from "../../lib/backup-encryption";

// Test configuration
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const INVALID_KEY_SHORT = "0123456789abcdef"; // Too short
const INVALID_KEY_LONG = TEST_KEY + "00"; // Too long
const INVALID_KEY_NON_HEX = "gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg";

// Test data
const SMALL_DATA = Buffer.from("Hello, World! This is a test backup file.");
const MEDIUM_DATA = Buffer.alloc(1024 * 10, "A"); // 10 KB
const LARGE_DATA = Buffer.alloc(1024 * 100, "B"); // 100 KB
const EMPTY_DATA = Buffer.alloc(0);
const BINARY_DATA = Buffer.from([0x00, 0xFF, 0x42, 0x13, 0x37, 0xDE, 0xAD, 0xBE, 0xEF]);

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  const startTime = Date.now();
  try {
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
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage, duration });
    console.error(`❌ ${name}: ${errorMessage} (${duration}ms)`);
  }
}

async function runTests() {
  console.log("🧪 Starting Backup Encryption Unit Tests\n");

  // ============================================
  // Key Generation and Validation Tests
  // ============================================
  console.log("📋 Key Generation and Validation Tests\n");

  test("generateEncryptionKey returns 64-character hex string", () => {
    const key = generateEncryptionKey();
    if (key.length !== 64) {
      throw new Error(`Expected 64 characters, got ${key.length}`);
    }
    if (!/^[0-9a-f]{64}$/.test(key)) {
      throw new Error("Key is not hexadecimal");
    }
  });

  test("validateEncryptionKey accepts valid key", () => {
    if (!validateEncryptionKey(TEST_KEY)) {
      throw new Error("Valid key was rejected");
    }
  });

  test("validateEncryptionKey rejects short key", () => {
    if (validateEncryptionKey(INVALID_KEY_SHORT)) {
      throw new Error("Short key was accepted");
    }
  });

  test("validateEncryptionKey rejects long key", () => {
    if (validateEncryptionKey(INVALID_KEY_LONG)) {
      throw new Error("Long key was accepted");
    }
  });

  test("validateEncryptionKey rejects non-hex key", () => {
    if (validateEncryptionKey(INVALID_KEY_NON_HEX)) {
      throw new Error("Non-hex key was accepted");
    }
  });

  // ============================================
  // Checksum Tests
  // ============================================
  console.log("\n📋 Checksum Calculation Tests\n");

  test("calculateChecksum returns SHA-256 hash", () => {
    const checksum = calculateChecksum(SMALL_DATA);
    if (checksum.length !== 64) {
      throw new Error(`Expected 64-character hash, got ${checksum.length}`);
    }
    if (!/^[0-9a-f]{64}$/.test(checksum)) {
      throw new Error("Checksum is not hexadecimal");
    }
  });

  test("calculateChecksum is deterministic", () => {
    const checksum1 = calculateChecksum(SMALL_DATA);
    const checksum2 = calculateChecksum(SMALL_DATA);
    if (checksum1 !== checksum2) {
      throw new Error("Checksum is not deterministic");
    }
  });

  test("calculateChecksum produces different hashes for different data", () => {
    const checksum1 = calculateChecksum(Buffer.from("data1"));
    const checksum2 = calculateChecksum(Buffer.from("data2"));
    if (checksum1 === checksum2) {
      throw new Error("Different data produced same checksum");
    }
  });

  test("verifyChecksum returns true for matching checksums", () => {
    const checksum = calculateChecksum(SMALL_DATA);
    if (!verifyChecksum(SMALL_DATA, checksum)) {
      throw new Error("Valid checksum was rejected");
    }
  });

  test("verifyChecksum returns false for mismatched checksums", () => {
    const checksum = calculateChecksum(SMALL_DATA);
    const wrongData = Buffer.from("wrong data");
    if (verifyChecksum(wrongData, checksum)) {
      throw new Error("Invalid checksum was accepted");
    }
  });

  // ============================================
  // Encryption Tests
  // ============================================
  console.log("\n📋 Encryption Tests\n");

  test("encryptBackupFile encrypts small data", async () => {
    const result = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    if (result.encryptedBuffer.length === 0) {
      throw new Error("Encrypted data is empty");
    }
    if (result.iv.length === 0) {
      throw new Error("IV is empty");
    }
    if (result.salt.length === 0) {
      throw new Error("Salt is empty");
    }
    if (result.authTag.length === 0) {
      throw new Error("Auth tag is empty");
    }
    if (result.checksum.length !== 64) {
      throw new Error("Invalid checksum length");
    }
  });

  test("encryptBackupFile produces different IV for each encryption", async () => {
    const result1 = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const result2 = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    if (result1.iv === result2.iv) {
      throw new Error("IVs are not unique");
    }
  });

  test("encryptBackupFile produces different salt for each encryption", async () => {
    const result1 = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const result2 = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    if (result1.salt === result2.salt) {
      throw new Error("Salts are not unique");
    }
  });

  test("encryptBackupFile encrypts medium data", async () => {
    const result = await encryptBackupFile(MEDIUM_DATA, TEST_KEY);
    if (result.encryptedBuffer.length === 0) {
      throw new Error("Encrypted data is empty");
    }
    if (result.originalSize !== MEDIUM_DATA.length) {
      throw new Error("Original size mismatch");
    }
  });

  test("encryptBackupFile encrypts large data", async () => {
    const result = await encryptBackupFile(LARGE_DATA, TEST_KEY);
    if (result.encryptedBuffer.length === 0) {
      throw new Error("Encrypted data is empty");
    }
    if (result.originalSize !== LARGE_DATA.length) {
      throw new Error("Original size mismatch");
    }
  });

  test("encryptBackupFile encrypts binary data", async () => {
    const result = await encryptBackupFile(BINARY_DATA, TEST_KEY);
    if (result.encryptedBuffer.length === 0) {
      throw new Error("Encrypted data is empty");
    }
  });

  test("encryptBackupFile throws error for invalid key", async () => {
    try {
      await encryptBackupFile(SMALL_DATA, INVALID_KEY_SHORT);
      throw new Error("Should have thrown error for invalid key");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("key")) {
        throw new Error("Wrong error type thrown");
      }
    }
  });

  // ============================================
  // Decryption Tests
  // ============================================
  console.log("\n📋 Decryption Tests\n");

  test("decryptBackupFile decrypts small data correctly", async () => {
    const encrypted = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    if (!decrypted.equals(SMALL_DATA)) {
      throw new Error("Decrypted data does not match original");
    }
  });

  test("decryptBackupFile decrypts medium data correctly", async () => {
    const encrypted = await encryptBackupFile(MEDIUM_DATA, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    if (!decrypted.equals(MEDIUM_DATA)) {
      throw new Error("Decrypted data does not match original");
    }
  });

  test("decryptBackupFile decrypts large data correctly", async () => {
    const encrypted = await encryptBackupFile(LARGE_DATA, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    if (!decrypted.equals(LARGE_DATA)) {
      throw new Error("Decrypted data does not match original");
    }
  });

  test("decryptBackupFile decrypts binary data correctly", async () => {
    const encrypted = await encryptBackupFile(BINARY_DATA, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    if (!decrypted.equals(BINARY_DATA)) {
      throw new Error("Decrypted data does not match original");
    }
  });

  test("decryptBackupFile throws error for wrong key", async () => {
    const wrongKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
    const encrypted = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    try {
      await decryptBackupFile(
        encrypted.encryptedBuffer,
        encrypted.iv,
        encrypted.salt,
        encrypted.authTag,
        wrongKey
      );
      throw new Error("Should have thrown error for wrong key");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("key")) {
        throw new Error("Wrong error type thrown");
      }
    }
  });

  test("decryptBackupFile throws error for tampered data", async () => {
    const encrypted = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const tamperedData = Buffer.from(encrypted.encryptedBuffer);
    tamperedData[0] = tamperedData[0] ^ 0xFF; // Flip bits
    try {
      await decryptBackupFile(
        tamperedData,
        encrypted.iv,
        encrypted.salt,
        encrypted.authTag,
        TEST_KEY
      );
      throw new Error("Should have thrown error for tampered data");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("auth")) {
        throw new Error("Wrong error type thrown");
      }
    }
  });

  test("decryptBackupFile throws error for wrong IV", async () => {
    const encrypted = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const wrongIV = Buffer.from(encrypted.iv, "base64");
    wrongIV[0] = wrongIV[0] ^ 0xFF;
    const wrongIVBase64 = wrongIV.toString("base64");
    try {
      await decryptBackupFile(
        encrypted.encryptedBuffer,
        wrongIVBase64,
        encrypted.salt,
        encrypted.authTag,
        TEST_KEY
      );
      throw new Error("Should have thrown error for wrong IV");
    } catch (error) {
      // Should fail during decryption
      if (!(error instanceof Error)) {
        throw new Error("Should have thrown error");
      }
    }
  });

  // ============================================
  // Round-trip Tests
  // ============================================
  console.log("\n📋 Round-trip Tests\n");

  test("encrypt and decrypt round-trip preserves data", async () => {
    const testData = Buffer.from("Round-trip test data with special chars: !@#$%^&*()");
    const encrypted = await encryptBackupFile(testData, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    if (!decrypted.equals(testData)) {
      throw new Error("Round-trip failed");
    }
  });

  test("encrypt and decrypt round-trip preserves checksum", async () => {
    const encrypted = await encryptBackupFile(SMALL_DATA, TEST_KEY);
    const decrypted = await decryptBackupFile(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
      TEST_KEY
    );
    const decryptedChecksum = calculateChecksum(decrypted);
    if (decryptedChecksum !== encrypted.checksum) {
      throw new Error("Checksum mismatch after round-trip");
    }
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

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
  console.log(`📈 Average Duration: ${Math.round(totalDuration / results.length)}ms`);
  
  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);

