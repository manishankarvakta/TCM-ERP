# MinIO to Local Storage Migration Guide

This document details the architectural shift from external MinIO object storage to a Docker-native local filesystem storage system.

## 1. Rationale for Migration

The transition from MinIO to local storage was driven by several key factors:
- **Infrastructure Simplicity**: Removed the need to manage a separate MinIO container and its associated networking/credentials.
- **Performance**: Local filesystem I/O is significantly faster than S3-compatible network requests, especially for small files and batch operations.
- **Reliability**: Eliminates the "connection failed" errors previously encountered when the MinIO service was slow to start or unreachable.
- **Resource Efficiency**: Reduced the overall memory and CPU footprint by removing the MinIO service and AWS SDK dependencies.

## 2. Architectural Changes

### 2.1 Storage Abstraction (`lib/storage.ts`)
A new abstraction layer was introduced to unify all file operations. Instead of direct S3 calls, all components now use the `storage` utility.

**Old Pattern (MinIO):**
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client(...);
await s3.send(new PutObjectCommand({ Bucket: 'uploads', Key: 'file.txt', Body: buffer }));
```

**New Pattern (Local Storage):**
```typescript
import { storage } from "@/lib/storage";
await storage.saveFile('file.txt', buffer);
```

### 2.2 Data Persistence
Files are now stored in a host-bound Docker volume:
- **Container Path**: `/app/uploads`
- **Host Path**: `./volumes/uploads`
- **Environment Variable**: `UPLOAD_DIR` (defaults to `./uploads` in development)

## 3. Implementation Details

### 3.1 Deleted Components
- `lib/minio.ts`: Legacy S3 client configuration and initialization.
- `@aws-sdk/client-s3`: Removed from `package.json`.
- `@aws-sdk/s3-request-presigner`: Removed from `package.json`.

### 3.2 Refactored Modules

#### File Manager API
The file download and preview routes (`app/api/files/[...key]/route.ts`) now act as a proxy to the local filesystem, verifying database permissions before reading the file buffer from disk.

#### Backup System
The backup system was completely rewritten to handle local files:
- **Creation**: The system recursively scans the `UPLOAD_DIR`, reads files as buffers, and streams them into a ZIP archive.
- **Restoration**: The "Time Machine" restore logic now clears the `UPLOAD_DIR` and extracts files directly from the backup ZIP using `storage.saveFile`.

### 3.3 Database Synchronization
The `prisma.file` model remains unchanged. The `storageKey` field, which previously held the S3 object key, now represents the relative path of the file within the `UPLOAD_DIR`. This ensures 100% compatibility with existing database records.

## 4. Environment Configuration

The following `MINIO_*` variables are now **deprecated** and can be removed:
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_NAME`

**New Configuration:**
- `UPLOAD_DIR`: (Optional) The absolute path to the storage directory inside the container. Defaults to `/app/uploads` in production Docker environments.

## 5. Infrastructure (Docker)

The `docker-compose.yml` has been updated to remove the `minio` service and add a persistent volume mount for the application:

```yaml
services:
  app:
    volumes:
      - ./volumes/uploads:/app/uploads
```

## 6. Verification Steps

To ensure the migration is working correctly in a new environment:
1. **Upload**: Navigate to the File Manager and upload a test image.
2. **Preview**: Verify the image renders correctly in the UI.
3. **Storage Check**: Check the host machine's `./volumes/uploads` directory to see if the file exists.
4. **Backup**: Trigger a "Files Backup" from the Settings -> Backup tab and verify the resulting ZIP contains your uploaded files.
5. **Restore**: Perform a restore and verify the files are still accessible.

---
*Documentation Version: 1.0.0*
*Migration Completed: May 2026*
