# Backup Encryption Testing Guide

This guide provides comprehensive testing procedures for the encrypted backup system.

## Table of Contents

1. [Test Setup](#test-setup)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Manual Testing Checklist](#manual-testing-checklist)
5. [Security Validation](#security-validation)
6. [Performance Benchmarks](#performance-benchmarks)

## Test Setup

### Prerequisites

1. **Install Testing Dependencies** (optional - for advanced testing):
   ```bash
   npm install --save-dev vitest @vitest/ui
   ```

2. **Set Up Test Environment Variables**:
   Create a `.env.test` file:
   ```env
   BACKUP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   BACKUP_ENCRYPTION_ENABLED=true
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db?schema=public
   ```

3. **Test Directory Structure**:
   ```
   startup-mvp/
   ├── tests/
   │   ├── unit/
   │   │   └── backup-encryption.test.ts
   │   ├── integration/
   │   │   ├── backup-creation.test.ts
   │   │   └── backup-restore.test.ts
   │   ├── security/
   │   │   └── encryption-validation.test.ts
   │   └── performance/
   │       └── encryption-benchmark.ts
   ```

## Running Tests

### Option 1: Using tsx (No additional setup)
```bash
# Run unit tests
tsx tests/unit/backup-encryption.test.ts

# Run integration tests
tsx tests/integration/backup-creation.test.ts
tsx tests/integration/backup-restore.test.ts

# Run security tests
tsx tests/security/encryption-validation.test.ts

# Run performance benchmarks
tsx tests/performance/encryption-benchmark.ts
```

### Option 2: Using Vitest (Recommended for CI/CD)
```bash
# Install Vitest
npm install --save-dev vitest @vitest/ui

# Add to package.json scripts:
# "test": "vitest",
# "test:ui": "vitest --ui"

# Run all tests
npm test

# Run with UI
npm run test:ui
```

## Test Categories

### 1. Unit Tests
Test individual encryption/decryption functions in isolation.

**Coverage:**
- Key generation and validation
- Encryption/decryption operations
- Checksum calculation
- Error handling
- Edge cases

### 2. Integration Tests
Test backup creation and restore workflows end-to-end.

**Coverage:**
- Encrypted backup creation
- Encrypted backup restore
- Metadata management
- File system operations
- Error recovery

### 3. Security Validation
Verify encryption security properties.

**Coverage:**
- Key strength
- IV uniqueness
- Authentication tag verification
- Checksum integrity
- Tamper detection

### 4. Performance Benchmarks
Measure encryption/decryption performance.

**Coverage:**
- Encryption speed
- Decryption speed
- Memory usage
- Large file handling

## Test Data

### Sample Test Data

**Small Backup (1 KB):**
- SQL file with 10 INSERT statements
- Used for quick tests

**Medium Backup (1 MB):**
- SQL file with ~10,000 INSERT statements
- Used for integration tests

**Large Backup (10 MB):**
- SQL file with ~100,000 INSERT statements
- Used for performance tests

## Success Criteria

### Unit Tests
- ✅ All encryption functions work correctly
- ✅ All decryption functions work correctly
- ✅ Error handling works as expected
- ✅ Edge cases are handled

### Integration Tests
- ✅ Encrypted backups can be created
- ✅ Encrypted backups can be restored
- ✅ Metadata is correctly stored/retrieved
- ✅ Unencrypted backups still work

### Security Validation
- ✅ Encryption key is never exposed
- ✅ Each backup has unique IV
- ✅ Checksum verification works
- ✅ Tampered files are detected

### Performance
- ✅ Encryption adds < 30% overhead
- ✅ Decryption adds < 30% overhead
- ✅ Memory usage is acceptable
- ✅ Large files handled efficiently

## Troubleshooting Tests

### Common Issues

**Issue:** "BACKUP_ENCRYPTION_KEY not set"
- **Solution:** Set environment variable before running tests

**Issue:** "Cannot find module"
- **Solution:** Run tests from project root directory

**Issue:** "Permission denied" (file operations)
- **Solution:** Ensure test directory has write permissions

**Issue:** "Database connection failed"
- **Solution:** Start test database or use mock

## Next Steps

After running tests:
1. Review test results
2. Fix any failing tests
3. Update documentation if needed
4. Run performance benchmarks
5. Validate security properties

