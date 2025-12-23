# Backup Encryption Test Suite

This directory contains comprehensive tests for the encrypted backup system.

## Quick Start

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
# Unit tests
npm run test:unit

# Integration tests - Backup creation
npm run test:integration:create

# Integration tests - Backup restore
npm run test:integration:restore

# Security validation
npm run test:security

# Performance benchmarks
npm run test:performance
```

### Run Tests Directly with tsx
```bash
tsx tests/unit/backup-encryption.test.ts
tsx tests/integration/backup-creation.test.ts
tsx tests/integration/backup-restore.test.ts
tsx tests/security/encryption-validation.test.ts
tsx tests/performance/encryption-benchmark.ts
```

## Test Structure

```
tests/
├── unit/                          # Unit tests
│   └── backup-encryption.test.ts # Encryption/decryption functions
├── integration/                   # Integration tests
│   ├── backup-creation.test.ts    # Backup creation workflow
│   └── backup-restore.test.ts     # Backup restore workflow
├── security/                      # Security validation
│   └── encryption-validation.test.ts # Security properties
├── performance/                   # Performance benchmarks
│   └── encryption-benchmark.ts    # Speed and memory tests
├── MANUAL_TESTING_CHECKLIST.md    # Manual testing guide
└── README.md                      # This file
```

## Prerequisites

### Environment Variables

Set up test environment variables before running tests:

```bash
# Generate a test encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env or set as environment variable
export BACKUP_ENCRYPTION_KEY="<your-64-char-hex-key>"
export BACKUP_ENCRYPTION_ENABLED="true"
```

### Database (for integration tests)

Integration tests require a database connection. Set up:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Or set DATABASE_URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_db?schema=public"
```

### MinIO (for files/full backup tests)

Files and full backup tests require MinIO:

```bash
# Start MinIO
docker-compose up -d minio
```

## Test Categories

### 1. Unit Tests (`test:unit`)

Tests individual encryption/decryption functions in isolation.

**Coverage:**
- Key generation and validation
- Encryption/decryption operations
- Checksum calculation
- Error handling
- Edge cases

**Expected Duration:** ~2-5 seconds

### 2. Integration Tests - Creation (`test:integration:create`)

Tests backup creation workflow end-to-end.

**Coverage:**
- Encrypted backup creation
- Metadata file creation
- File system operations
- Error handling

**Expected Duration:** ~10-30 seconds (depends on database size)

### 3. Integration Tests - Restore (`test:integration:restore`)

Tests backup restore workflow end-to-end.

**Coverage:**
- Encrypted backup restore
- Decryption during restore
- Data integrity verification
- Error handling

**Expected Duration:** ~10-30 seconds (depends on database size)

### 4. Security Validation (`test:security`)

Verifies encryption security properties.

**Coverage:**
- Key strength
- IV uniqueness
- Authentication tag verification
- Checksum integrity
- Tamper detection
- Key exposure prevention

**Expected Duration:** ~3-5 seconds

### 5. Performance Benchmarks (`test:performance`)

Measures encryption/decryption performance.

**Coverage:**
- Encryption speed
- Decryption speed
- Memory usage
- Large file handling

**Expected Duration:** ~10-60 seconds (depends on file sizes)

## Test Results

### Success Criteria

All tests should pass with:
- ✅ 100% pass rate
- ✅ No security warnings
- ✅ Performance within targets
- ✅ No memory leaks

### Interpreting Results

**Unit Tests:**
- All encryption/decryption functions work correctly
- Error handling works as expected
- Edge cases are handled

**Integration Tests:**
- Encrypted backups can be created
- Encrypted backups can be restored
- Metadata is correctly stored/retrieved
- Unencrypted backups still work

**Security Tests:**
- Encryption key is never exposed
- Each backup has unique IV
- Checksum verification works
- Tampered files are detected

**Performance Tests:**
- Encryption adds < 30% overhead
- Decryption adds < 30% overhead
- Memory usage is acceptable
- Large files handled efficiently

## Troubleshooting

### Common Issues

**Issue:** "BACKUP_ENCRYPTION_KEY not set"
```bash
# Solution: Set environment variable
export BACKUP_ENCRYPTION_KEY="<your-key>"
```

**Issue:** "Cannot find module"
```bash
# Solution: Run from project root
cd startup-mvp
npm run test:unit
```

**Issue:** "Database connection failed"
```bash
# Solution: Start database or use test database
docker-compose up -d postgres
```

**Issue:** "Permission denied"
```bash
# Solution: Ensure test directory has write permissions
chmod -R 755 tests/
```

**Issue:** "MinIO not available"
```bash
# Solution: Start MinIO or skip files backup tests
docker-compose up -d minio
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Backup Encryption Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:all
        env:
          BACKUP_ENCRYPTION_KEY: ${{ secrets.BACKUP_ENCRYPTION_KEY }}
          BACKUP_ENCRYPTION_ENABLED: "true"
```

## Manual Testing

See [MANUAL_TESTING_CHECKLIST.md](./MANUAL_TESTING_CHECKLIST.md) for comprehensive manual testing procedures.

## Contributing

When adding new tests:

1. Follow existing test structure
2. Use descriptive test names
3. Include error handling
4. Clean up test data
5. Document any special requirements

## Support

For issues or questions:
1. Check test output for error messages
2. Verify environment variables are set
3. Check database/MinIO connectivity
4. Review test logs for details

