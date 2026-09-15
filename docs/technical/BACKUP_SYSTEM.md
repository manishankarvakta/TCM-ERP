# Backup System Documentation

## Overview

The backup system provides comprehensive data protection for the Espacio MVP application through automated and manual backups, integrity validation, and Time Machine-style restore capabilities.

## Architecture

### Core Principles

1. **Single ZIP Architecture**: Each backup is a single `.zip` file containing all backup data and embedded metadata
2. **Filesystem-based**: No database records for backups; metadata is embedded directly in ZIP files
3. **Three Backup Types**: Database only, Files only, or Full backup (both)
4. **Real-time Progress**: Server-Sent Events (SSE) provide live restore progress updates
5. **Integrity Validation**: SHA-256 checksums and structure validation ensure backup reliability

### Directory Structure

```
/backups/
├── database/
│   └── backup-20240101-120000.zip
│       ├── metadata.json
│       └── database.dump
├── files/
│   └── backup-20240101-130000.zip
│       ├── metadata.json
│       └── [Local files...]
└── full/
    └── backup-20240101-140000.zip
        ├── metadata.json
        ├── database.dump
        └── files/
            └── [Local files...]
```

## Backup Types

### 1. Database Backup

- **Contents**: PostgreSQL database dump (custom format)
- **Tool**: `pg_dump` with `-Fc` (custom compressed binary format)
- **Size**: Typically 1-100MB depending on data volume
- **Speed**: Fast (seconds to minutes)

**Use cases**:
- Regular data snapshots
- Before schema migrations
- Development/testing environments

### 2. Files Backup

- **Contents**: All files from local storage
- **Format**: Recursive compression of uploads directory
- **Size**: Varies based on file storage usage
- **Speed**: Moderate (depends on file count and size)

**Use cases**:
- Media/document backups
- File integrity verification
- Migration to new storage

### 3. Full Backup

- **Contents**: Database + Files
- **Format**: Combined ZIP with organized structure
- **Size**: Largest (sum of database and files)
- **Speed**: Slowest (complete system snapshot)

**Use cases**:
- Production backups
- Disaster recovery preparation
- Complete system migration

## Metadata Structure

Each backup contains a `metadata.json` file with comprehensive information:

```json
{
  "id": "backup-20240101-120000",
  "type": "full",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "size": 104857600,
  "encrypted": false,
  "checksum": "sha256:abc123...",
  "version": "1.0",
  "application": {
    "name": "espacio-mvp",
    "version": "1.0.0"
  },
  "database": {
    "size": 10485760,
    "format": "custom",
    "tables": ["users", "products", "..."],
    "recordCount": 10000
  },
  "files": {
    "count": 150,
    "totalSize": 94371840
  },
  "compression": {
    "algorithm": "deflate",
    "level": 6
  },
  "createdBy": "admin@example.com",
  "description": "Pre-deployment backup"
}
```

## Restore Process

### Restore Flow

1. **Validation** (0-10%): Verify backup integrity, checksum, and structure
2. **Preparation** (10-20%): Create pre-restore backup (optional)
3. **Extraction** (20-30%): Extract files from ZIP
4. **Restoration** (30-90%): Restore database and/or files
5. **Verification** (90-95%): Verify restored data
6. **Completion** (95-100%): Cleanup and finalize

### Restore State Machine

```
IDLE → VALIDATING → PREPARING → EXTRACTING → 
  RESTORING_DATABASE / RESTORING_FILES → 
  VERIFYING → COMPLETED / FAILED
```

### Progress Tracking

Real-time progress is streamed via Server-Sent Events (SSE):

```typescript
// Client subscribes to progress endpoint
const eventSource = new EventSource('/api/backup/restore/{restoreId}/progress');

eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  // Update UI with progress.status, progress.progress, progress.logs
};
```

## API Endpoints

### Backup Operations

#### `POST /api/backup/create`
Create a new backup.

**Request**:
```json
{
  "type": "database" | "files" | "full",
  "options": {
    "description": "Optional description",
    "compression": "fast" | "best",
    "includeTables": ["table1", "table2"],  // Optional
    "excludeTables": ["temp_*"]             // Optional
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "metadata": { /* BackupMetadata */ },
    "duration": 5000
  }
}
```

#### `GET /api/backup/list`
List all backups (optionally filtered).

**Query Parameters**:
- `type`: Filter by backup type (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "backups": [ /* BackupListItem[] */ ],
    "total": 10,
    "byType": {
      "database": 3,
      "files": 2,
      "full": 5
    }
  }
}
```

#### `GET /api/backup/[backupId]`
Get backup details.

**Response**:
```json
{
  "success": true,
  "data": { /* BackupListItem */ }
}
```

#### `DELETE /api/backup/[backupId]`
Delete a backup.

**Response**:
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

#### `GET /api/backup/[backupId]/download`
Download a backup file (streaming).

**Response**: ZIP file stream

#### `POST /api/backup/upload`
Upload a backup file.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "success": true,
  "data": {
    "metadata": { /* BackupMetadata */ },
    "filePath": "/path/to/backup.zip",
    "message": "Backup uploaded successfully"
  }
}
```

### Restore Operations

#### `POST /api/backup/[backupId]/restore`
Start a restore operation.

**Request**:
```json
{
  "options": {
    "createPreRestoreBackup": true,
    "skipVerification": false,
    "cleanDatabase": true,
    "clearFiles": true // Clear local files before restore
  }
}
```

**Response** (202 Accepted):
```json
{
  "success": true,
  "data": {
    "restoreId": "restore-1234567890-abc123",
    "progressUrl": "/api/backup/restore/{restoreId}/progress"
  }
}
```

#### `GET /api/backup/restore/[restoreId]/progress`
Server-Sent Events endpoint for real-time progress.

**Response**: SSE stream with `RestoreProgress` objects

## Error Handling

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_INPUT` | Invalid request parameters | No |
| `BACKUP_CREATION_FAILED` | Backup creation failed | Yes |
| `DATABASE_DUMP_FAILED` | pg_dump command failed | Yes |
| `FILES_BACKUP_FAILED` | File backup operation failed | Yes |
| `DISK_SPACE_INSUFFICIENT` | Not enough disk space | No |
| `BACKUP_NOT_FOUND` | Backup file not found | No |
| `INVALID_BACKUP_FILE` | Invalid backup format | No |
| `FILE_TOO_LARGE` | File exceeds size limit | No |
| `RESTORE_FAILED` | Restore operation failed | Yes |
| `RESTORE_IN_PROGRESS` | Another restore is running | Yes |
| `VALIDATION_FAILED` | Backup validation failed | No |
| `CHECKSUM_MISMATCH` | File integrity check failed | No |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "error": "User-friendly message",
    "code": "ERROR_CODE",
    "details": "Technical details",
    "retryable": true
  }
}
```

## Security Considerations

1. **Authentication**: All API routes should verify user authentication
2. **Authorization**: Implement role-based access control for backup operations
3. **Path Traversal**: All file paths are sanitized using `path.basename()`
4. **File Size Limits**: Maximum upload size of 2GB enforced
5. **Checksums**: SHA-256 checksums verify file integrity
6. **Sensitive Data**: No passwords or secrets logged in errors or progress

## Performance Optimization

### Streaming

- ZIP creation uses `archiver` with streaming to avoid memory issues
- Local files are read and added to ZIP efficiently
- File downloads use Node.js streams for efficient transfer

### Memory Management

- No large files are loaded entirely into memory
- Temporary files are cleaned up after operations
- Progress updates are throttled to prevent overhead

### Disk Space

- System checks available disk space before operations
- Minimum 1GB free space required
- Temp files are stored in `/tmp/backups/`

## Monitoring and Logging

### Log Levels

- **INFO**: Normal operations (backup created, restore started)
- **WARN**: Non-critical issues (file skipped, retry attempted)
- **ERROR**: Critical failures (backup failed, restore failed)

### Metrics to Monitor

1. **Backup Creation Time**: Track duration by type and size
2. **Backup Success Rate**: Percentage of successful backups
3. **Restore Success Rate**: Percentage of successful restores
4. **Storage Usage**: Total size of all backups
5. **API Response Times**: P50, P95, P99 latencies

## Troubleshooting

### Common Issues

#### "pg_dump command not found"

**Solution**: Install PostgreSQL client tools on the server.

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

#### "Database authentication failed"

**Solution**: Verify `DATABASE_URL` environment variable is correct.

#### "Storage operation failed"

**Solution**: Check filesystem permissions and UPLOAD_DIR configuration.

#### "Backup validation failed"

**Solution**: Backup file may be corrupted. Delete and create a new backup.

#### "Disk space insufficient"

**Solution**: Free up disk space or configure a larger storage volume.

## Best Practices

1. **Regular Backups**: Schedule automatic backups (daily for production)
2. **Test Restores**: Periodically test restore functionality
3. **Multiple Copies**: Keep backups in multiple locations (e.g., different disks or servers)
4. **Retention Policy**: Define how long to keep backups
5. **Pre-Migration Backups**: Always backup before major changes
6. **Monitor Storage**: Alert when backup storage is running low
7. **Verify Checksums**: Always validate backup integrity after creation

## Advanced Usage

### Custom Backup Scripts

```typescript
import { createFullBackup } from '@/lib/backup/create';

async function scheduledBackup() {
  const metadata = await createFullBackup({
    description: `Scheduled backup ${new Date().toISOString()}`,
  });
  
  console.log(`Backup created: ${metadata.id}`);
}
```

### Backup to External Storage

After creating a backup, copy it to external storage:

```bash
#!/bin/bash
# Sync backups to remote server
rsync -avz /backups/full/ user@remote-server:/path/to/backups/
```

### Cleanup Old Backups

```typescript
import { listAllBackups, deleteBackup } from '@/lib/backup/list';

async function cleanupOldBackups(daysToKeep: number) {
  const backups = await listAllBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  for (const backup of backups) {
    const backupDate = new Date(backup.metadata.timestamp);
    if (backupDate < cutoffDate) {
      await deleteBackup(backup.metadata.id);
      console.log(`Deleted old backup: ${backup.metadata.id}`);
    }
  }
}
```

## Related Documentation

- [Deployment Guide](./BACKUP_DEPLOYMENT.md)
- [API Reference](../README.md#api-endpoints)
- [Type Definitions](../types/backup.ts)

