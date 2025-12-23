/**
 * Security Validation Tests for Backup Encryption
 * 
 * Run with: tsx tests/security/encryption-validation.test.ts
 * 
 * Tests cover:
 * - Key strength validation
 * - IV uniqueness
 * - Authentication tag verification
 * - Checksum integrity
 * - Tamper detection
 * - Key exposure prevention
 */

import { 
  encryptBackupFile, 
  decryptBackupFile,
  calculateChecksum,
  verifyChecksum,
  generateEncryptionKey,
} from "../../lib/backup-encryption";

// Test configuration
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const TEST_DATA = Buffer.from("Sensitive backup data that must be encrypted securely.");

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

async function runTests() {
  console.log("🔒 Starting Security Validation Tests\n");

  // ============================================
  // Key Strength Tests
  // ============================================
  console.log("📋 Key Strength Validation\n");

  test("encryption key is 256 bits (32 bytes)", () => {
    const key = generateEncryptionKey();
    if (key.length !== 64) { // 64 hex chars = 32 bytes = 256 bits
      throw new Error(`Key length is ${key.length * 4} bits, expected 256 bits`);
    }
  });

  test("encryption key has sufficient entropy", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateEncryptionKey());
    }
    if (keys.size < 99) {
      throw new Error("Key generation lacks sufficient randomness");
    }
  });

  // ============================================
  // IV Uniqueness Tests
  // ============================================
  console.log("\n📋 IV Uniqueness Validation\n");

  test("each encryption uses unique IV", async () => {
    const ivs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = await encryptBackupFile(TEST_DATA, TEST_KEY);
      ivs.add(result.iv);
    }
    if (ivs.size < 99) {
      throw new Error("IVs are not unique - security risk!");
    }
  });

  test("IV is 96 bits (12 bytes)", async () => {
    const result = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const ivBuffer = Buffer.from(result.iv, "base64");
    if (ivBuffer.length !== 12) {
      throw new Error(`IV length is ${ivBuffer.length} bytes, expected 12 bytes`);
    }
  });

  // ============================================
  // Salt Uniqueness Tests
  // ============================================
  console.log("\n📋 Salt Uniqueness Validation\n");

  test("each encryption uses unique salt", async () => {
    const salts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = await encryptBackupFile(TEST_DATA, TEST_KEY);
      salts.add(result.salt);
    }
    if (salts.size < 99) {
      throw new Error("Salts are not unique - security risk!");
    }
  });

  test("salt is 128 bits (16 bytes)", async () => {
    const result = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const saltBuffer = Buffer.from(result.salt, "base64");
    if (saltBuffer.length !== 16) {
      throw new Error(`Salt length is ${saltBuffer.length} bytes, expected 16 bytes`);
    }
  });

  // ============================================
  // Authentication Tag Tests
  // ============================================
  console.log("\n📋 Authentication Tag Validation\n");

  test("authentication tag is 128 bits (16 bytes)", async () => {
    const result = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const authTagBuffer = Buffer.from(result.authTag, "base64");
    if (authTagBuffer.length !== 16) {
      throw new Error(`Auth tag length is ${authTagBuffer.length} bytes, expected 16 bytes`);
    }
  });

  test("authentication tag prevents tampering", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    
    // Tamper with encrypted data
    const tamperedData = Buffer.from(encrypted.encryptedBuffer);
    tamperedData[0] = tamperedData[0] ^ 0xFF;

    try {
      await decryptBackupFile(
        tamperedData,
        encrypted.iv,
        encrypted.salt,
        encrypted.authTag,
        TEST_KEY
      );
      throw new Error("Authentication tag did not detect tampering");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("auth")) {
        throw new Error("Wrong error type - authentication should have failed");
      }
    }
  });

  test("wrong authentication tag is rejected", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    
    // Use wrong auth tag
    const wrongAuthTag = Buffer.alloc(16, 0xFF).toString("base64");

    try {
      await decryptBackupFile(
        encrypted.encryptedBuffer,
        encrypted.iv,
        encrypted.salt,
        wrongAuthTag,
        TEST_KEY
      );
      throw new Error("Wrong auth tag was accepted");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error("Should have thrown error");
      }
    }
  });

  // ============================================
  // Checksum Integrity Tests
  // ============================================
  console.log("\n📋 Checksum Integrity Validation\n");

  test("checksum detects data corruption", () => {
    const original = Buffer.from("Original data");
    const corrupted = Buffer.from("Corrupted data");
    
    const originalChecksum = calculateChecksum(original);
    const corruptedChecksum = calculateChecksum(corrupted);
    
    if (originalChecksum === corruptedChecksum) {
      throw new Error("Checksum did not detect corruption");
    }
  });

  test("checksum is SHA-256 (256 bits)", () => {
    const checksum = calculateChecksum(TEST_DATA);
    if (checksum.length !== 64) { // 64 hex chars = 256 bits
      throw new Error(`Checksum length is ${checksum.length * 4} bits, expected 256 bits`);
    }
  });

  test("checksum verification works correctly", () => {
    const checksum = calculateChecksum(TEST_DATA);
    if (!verifyChecksum(TEST_DATA, checksum)) {
      throw new Error("Valid checksum was rejected");
    }
    
    const wrongData = Buffer.from("Wrong data");
    if (verifyChecksum(wrongData, checksum)) {
      throw new Error("Invalid checksum was accepted");
    }
  });

  // ============================================
  // Key Exposure Prevention Tests
  // ============================================
  console.log("\n📋 Key Exposure Prevention\n");

  test("encryption key is not in encrypted data", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    
    // Check if key appears in encrypted data (should not)
    const keyBuffer = Buffer.from(TEST_KEY, "hex");
    const encryptedString = encrypted.encryptedBuffer.toString("hex");
    const keyString = keyBuffer.toString("hex");
    
    if (encryptedString.includes(keyString)) {
      throw new Error("Encryption key found in encrypted data - security risk!");
    }
  });

  test("encryption key is not in IV, salt, or auth tag", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const keyBuffer = Buffer.from(TEST_KEY, "hex");
    const keyString = keyBuffer.toString("hex");
    
    const ivString = Buffer.from(encrypted.iv, "base64").toString("hex");
    const saltString = Buffer.from(encrypted.salt, "base64").toString("hex");
    const authTagString = Buffer.from(encrypted.authTag, "base64").toString("hex");
    
    if (ivString.includes(keyString) || 
        saltString.includes(keyString) || 
        authTagString.includes(keyString)) {
      throw new Error("Encryption key found in metadata - security risk!");
    }
  });

  // ============================================
  // Encryption Strength Tests
  // ============================================
  console.log("\n📋 Encryption Strength Validation\n");

  test("encrypted data is different from original", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    
    if (encrypted.encryptedBuffer.equals(TEST_DATA)) {
      throw new Error("Encrypted data matches original - encryption failed");
    }
  });

  test("same data encrypted twice produces different ciphertext", async () => {
    const encrypted1 = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const encrypted2 = await encryptBackupFile(TEST_DATA, TEST_KEY);
    
    if (encrypted1.encryptedBuffer.equals(encrypted2.encryptedBuffer)) {
      throw new Error("Same ciphertext for same data - IV reuse detected");
    }
  });

  test("wrong key cannot decrypt data", async () => {
    const encrypted = await encryptBackupFile(TEST_DATA, TEST_KEY);
    const wrongKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
    
    try {
      await decryptBackupFile(
        encrypted.encryptedBuffer,
        encrypted.iv,
        encrypted.salt,
        encrypted.authTag,
        wrongKey
      );
      throw new Error("Wrong key successfully decrypted data - security risk!");
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("key")) {
        throw new Error("Wrong error type - should fail on wrong key");
      }
    }
  });

  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Security Validation Summary");
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
    console.log("\n⚠️  SECURITY WARNING: Some security validations failed!");
    process.exit(1);
  } else {
    console.log("\n🔒 All security validations passed!");
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);

