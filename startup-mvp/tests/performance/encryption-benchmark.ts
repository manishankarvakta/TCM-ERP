/**
 * Performance Benchmarks for Backup Encryption
 * 
 * Run with: tsx tests/performance/encryption-benchmark.ts
 * 
 * Measures:
 * - Encryption speed
 * - Decryption speed
 * - Memory usage
 * - Large file handling
 */

import { 
  encryptBackupFile, 
  decryptBackupFile,
  calculateChecksum,
} from "../../lib/backup-encryption";

// Test configuration
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Test data sizes
const SIZES = {
  small: 1024,           // 1 KB
  medium: 1024 * 100,    // 100 KB
  large: 1024 * 1024,    // 1 MB
  xlarge: 1024 * 1024 * 10, // 10 MB
};

interface BenchmarkResult {
  size: string;
  sizeBytes: number;
  encryptionTime: number;
  decryptionTime: number;
  checksumTime: number;
  encryptionSpeed: number; // MB/s
  decryptionSpeed: number; // MB/s
  memoryUsage?: number; // MB
}

const results: BenchmarkResult[] = [];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatSpeed(bytes: number, ms: number): string {
  const mb = bytes / (1024 * 1024);
  const seconds = ms / 1000;
  const speed = mb / seconds;
  return speed.toFixed(2) + " MB/s";
}

async function benchmarkEncryption(sizeBytes: number, label: string): Promise<BenchmarkResult> {
  console.log(`\n📊 Benchmarking ${label} (${formatBytes(sizeBytes)})...`);
  
  // Generate test data
  const testData = Buffer.alloc(sizeBytes, "A");
  
  // Measure checksum calculation
  const checksumStart = process.hrtime.bigint();
  const checksum = calculateChecksum(testData);
  const checksumEnd = process.hrtime.bigint();
  const checksumTime = Number(checksumEnd - checksumStart) / 1_000_000; // Convert to ms
  
  // Measure encryption
  const encryptStart = process.hrtime.bigint();
  const encrypted = await encryptBackupFile(testData, TEST_KEY);
  const encryptEnd = process.hrtime.bigint();
  const encryptionTime = Number(encryptEnd - encryptStart) / 1_000_000;
  
  // Measure decryption
  const decryptStart = process.hrtime.bigint();
  const decrypted = await decryptBackupFile(
    encrypted.encryptedBuffer,
    encrypted.iv,
    encrypted.salt,
    encrypted.authTag,
    TEST_KEY
  );
  const decryptEnd = process.hrtime.bigint();
  const decryptionTime = Number(decryptEnd - decryptStart) / 1_000_000;
  
  // Verify decryption
  if (!decrypted.equals(testData)) {
    throw new Error("Decryption failed - data mismatch");
  }
  
  // Calculate speeds
  const encryptionSpeed = (sizeBytes / (1024 * 1024)) / (encryptionTime / 1000);
  const decryptionSpeed = (sizeBytes / (1024 * 1024)) / (decryptionTime / 1000);
  
  // Measure memory (approximate)
  const memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);
  
  const result: BenchmarkResult = {
    size: label,
    sizeBytes,
    encryptionTime,
    decryptionTime,
    checksumTime,
    encryptionSpeed,
    decryptionSpeed,
    memoryUsage,
  };
  
  results.push(result);
  
  console.log(`  ✅ Checksum: ${checksumTime.toFixed(2)}ms`);
  console.log(`  ✅ Encryption: ${encryptionTime.toFixed(2)}ms (${formatSpeed(sizeBytes, encryptionTime)})`);
  console.log(`  ✅ Decryption: ${decryptionTime.toFixed(2)}ms (${formatSpeed(sizeBytes, decryptionTime)})`);
  console.log(`  ✅ Memory: ${memoryUsage.toFixed(2)} MB`);
  
  return result;
}

async function runBenchmarks() {
  console.log("⚡ Starting Performance Benchmarks\n");
  console.log("=".repeat(60));
  
  // Run benchmarks for each size
  for (const [label, size] of Object.entries(SIZES)) {
    await benchmarkEncryption(size, label);
  }
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Performance Summary");
  console.log("=".repeat(60));
  console.log("\nSize\t\tEncrypt\t\tDecrypt\t\tChecksum\tMemory");
  console.log("-".repeat(60));
  
  for (const result of results) {
    console.log(
      `${result.size.padEnd(10)}\t` +
      `${result.encryptionTime.toFixed(2)}ms\t` +
      `${result.decryptionTime.toFixed(2)}ms\t` +
      `${result.checksumTime.toFixed(2)}ms\t` +
      `${result.memoryUsage?.toFixed(2)} MB`
    );
  }
  
  // Calculate averages
  const avgEncryptionSpeed = results.reduce((sum, r) => sum + r.encryptionSpeed, 0) / results.length;
  const avgDecryptionSpeed = results.reduce((sum, r) => sum + r.decryptionSpeed, 0) / results.length;
  
  console.log("\n" + "=".repeat(60));
  console.log("📈 Average Performance");
  console.log("=".repeat(60));
  console.log(`Average Encryption Speed: ${avgEncryptionSpeed.toFixed(2)} MB/s`);
  console.log(`Average Decryption Speed: ${avgDecryptionSpeed.toFixed(2)} MB/s`);
  
  // Performance targets
  console.log("\n" + "=".repeat(60));
  console.log("🎯 Performance Targets");
  console.log("=".repeat(60));
  console.log("Target: Encryption overhead < 30%");
  console.log("Target: Decryption overhead < 30%");
  console.log("Target: Large file (10MB) encryption < 5 seconds");
  console.log("Target: Large file (10MB) decryption < 5 seconds");
  
  // Check if targets are met
  const largeResult = results.find(r => r.size === "xlarge");
  if (largeResult) {
    const encryptionOverhead = (largeResult.encryptionTime / 1000) / (largeResult.sizeBytes / (1024 * 1024));
    const decryptionOverhead = (largeResult.decryptionTime / 1000) / (largeResult.sizeBytes / (1024 * 1024));
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Performance Validation");
    console.log("=".repeat(60));
    
    if (largeResult.encryptionTime < 5000) {
      console.log("✅ Large file encryption < 5 seconds");
    } else {
      console.log(`❌ Large file encryption: ${(largeResult.encryptionTime / 1000).toFixed(2)}s (target: < 5s)`);
    }
    
    if (largeResult.decryptionTime < 5000) {
      console.log("✅ Large file decryption < 5 seconds");
    } else {
      console.log(`❌ Large file decryption: ${(largeResult.decryptionTime / 1000).toFixed(2)}s (target: < 5s)`);
    }
  }
  
  console.log("\n🎉 Benchmarks completed!");
}

// Run benchmarks
runBenchmarks().catch(console.error);

