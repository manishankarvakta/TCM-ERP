# File Manager System Documentation

## Overview

The File Manager System provides a complete solution for file storage, management, and sharing using MinIO as the object storage backend. It includes features for uploading, downloading, organizing files in folders, and generating presigned URLs for secure access.

## Architecture

### Components

1. **MinIO Object Storage**: S3-compatible object storage running in Docker
2. **Database (PostgreSQL)**: Stores file metadata and ownership information
3. **Server Actions**: Handle file operations and security
4. **Client Components**: Provide UI for file management

### File Storage Structure

Files are stored in MinIO with the following key structure:
```
{userId}/{path}/{filename}
```

Example:
```
cm123abc/documents/report.pdf
cm123abc/images/photo.jpg
```

## Configuration

### Environment Variables

Required environment variables for MinIO configuration:

```bash
# MinIO Endpoint (internal Docker network name or localhost)
MINIO_ENDPOINT=localhost

# MinIO Port
MINIO_PORT=9000

# Use SSL (true/false)
MINIO_USE_SSL=false

# Access credentials
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Bucket name
MINIO_BUCKET_NAME=espacio-files

# Public URL (accessible from browser)
MINIO_PUBLIC_URL=http://localhost:9000
```

### Docker Configuration

MinIO runs in Docker with CORS enabled for browser uploads:

```yaml
espacio-minio:
  image: minio/minio:latest
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
    MINIO_API_CORS_ALLOW_ORIGIN: "*"
  ports:
    - "9000:9000"
    - "9001:9001"
```

## Core Features

### 1. File Upload

#### Direct Upload Flow

1. Client requests presigned URL from server
2. Server generates presigned URL with user's storage key
3. Client uploads file directly to MinIO using presigned URL
4. Client confirms upload with server
5. Server saves file metadata to database

#### Implementation

**Server Action** (`app/actions/files.ts`):
```typescript
export async function getUploadPresignedUrl(input: {
  path: string;
  name: string;
  contentType?: string;
}): Promise<ActionResult<{ url: string; key: string }>>
```

**Client Component** (`components/files/DirectUpload.tsx`):
```typescript
// 1. Get presigned URL
const result = await getUploadPresignedUrl({
  path: currentPath,
  name: file.name,
  contentType: file.type
});

// 2. Upload to MinIO
const xhr = new XMLHttpRequest();
xhr.open("PUT", result.data.url);
xhr.setRequestHeader("Content-Type", file.type);
xhr.send(file);

// 3. Confirm upload
await confirmUpload({
  key: result.data.key,
  size: file.size,
  mimeType: file.type,
  etag: xhr.getResponseHeader("ETag")
});
```

### 2. File Download

#### Download Flow

1. Client requests download URL for a file
2. Server verifies ownership
3. Server generates presigned download URL
4. Client downloads file using presigned URL

#### Implementation

```typescript
export async function getDownloadUrl(input: {
  key: string;
  expiresIn?: number;
}): Promise<ActionResult<{ url: string }>>
```

### 3. File Management

#### List Files and Folders

```typescript
export async function listFolder(input: {
  path: string;
}): Promise<ActionResult<{
  files: FileItem[];
  folders: FolderItem[];
  currentPath: string;
}>>
```

#### Create Folder

```typescript
export async function createFolder(input: {
  path: string;
  name: string;
}): Promise<ActionResult<{ folderId: string }>>
```

#### Delete File

```typescript
export async function deleteFile(input: {
  key: string;
}): Promise<ActionResult<{ deleted: boolean }>>
```

#### Rename File/Folder

```typescript
export async function renameFileOrFolder(input: {
  key: string;
  newName: string;
}): Promise<ActionResult<{ fileId: string }>>
```

#### Move File

```typescript
export async function moveFile(input: {
  key: string;
  newPath: string;
}): Promise<ActionResult<{ fileId: string }>>
```

### 4. Public URLs

Generate public URLs for files (requires public bucket policy):

```typescript
export async function getPublicUrl(input: {
  key: string;
}): Promise<ActionResult<{ url: string }>>
```

## UI Components

### 1. File Manager Page (`app/(dashboard)/dashboard/files/page.tsx`)

Main file management interface with:
- File/folder listing
- Upload functionality
- File operations (rename, delete, move)
- Breadcrumb navigation

### 2. Upload Dialog (`components/files/UploadDialog.tsx`)

Modal dialog for file uploads with:
- Drag & drop support
- Multiple file selection
- Upload progress tracking
- File type filtering

### 3. Direct Upload (`components/files/DirectUpload.tsx`)

Inline upload component with:
- Quick file upload
- Progress indication
- Error handling

### 4. File Grid/List (`components/files/FileGrid.tsx`, `FileList.tsx`)

Display files in grid or list view with:
- File previews
- File metadata
- Context menu actions

### 5. File Preview Dialog (`components/files/FilePreviewDialog.tsx`)

Preview files before downloading:
- Image preview
- PDF preview
- Video preview
- Download button

## Database Schema

### File Model

```prisma
model File {
  id          String   @id @default(cuid())
  name        String
  path        String   // Folder path (e.g., "/documents")
  storageKey  String   @unique // MinIO object key
  size        Int      // File size in bytes
  mimeType    String   // MIME type
  isFolder    Boolean  @default(false)
  etag        String?  // MinIO ETag for verification
  
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([ownerId])
  @@index([path])
  @@index([storageKey])
}
```

## Security

### Authentication

All file operations require authentication:
```typescript
async function getAuthenticatedUser(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User must be logged in");
  }
  return { id: session.user.id };
}
```

### Authorization

File ownership is verified before operations:
```typescript
async function verifyFileOwnership(
  userId: string,
  storageKey: string
): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { storageKey },
    select: { ownerId: true },
  });
  
  if (!file || file.ownerId !== userId) {
    throw new Error("Unauthorized");
  }
}
```

### Presigned URLs

- **Upload URLs**: Valid for 1 hour, scoped to specific file path
- **Download URLs**: Valid for 1 hour, verified ownership
- URLs are signed with MinIO credentials

## User Activity Logging

All file operations are logged:

```typescript
await createUserLog({
  userId: user.id,
  action: "FILE_UPLOADED",
  details: `File uploaded: ${filename}`,
  metadata: { fileId, path, size, mimeType }
});
```

Logged actions:
- `FILE_UPLOAD_URL_GENERATED`
- `FILE_UPLOADED`
- `FILE_UPDATED`
- `FILE_DELETED`
- `FILE_RENAMED`
- `FILE_MOVED`
- `FILE_DOWNLOAD_URL_GENERATED`
- `FILE_PUBLIC_URL_GENERATED`
- `FOLDER_CREATED`
- `FOLDER_DELETED`
- `FOLDER_RENAMED`

## Error Handling

### Common Errors

1. **403 Forbidden**: CORS not configured or wrong credentials
2. **404 Not Found**: File or bucket doesn't exist
3. **401 Unauthorized**: User not authenticated
4. **500 Internal Server Error**: MinIO connection issues

### Error Response Format

```typescript
{
  success: false,
  error: "Error message"
}
```

## Troubleshooting

### Upload Fails with 403 Error

**Cause**: CORS not configured or credential mismatch

**Solution**:
1. Ensure `MINIO_API_CORS_ALLOW_ORIGIN: "*"` is set in docker-compose.yml
2. Verify credentials match between .env and docker-compose.yml
3. Restart MinIO container

### Files Not Appearing

**Cause**: Bucket doesn't exist or wrong bucket name

**Solution**:
1. Check `MINIO_BUCKET_NAME` in .env
2. Run minio-setup container to create bucket
3. Verify bucket exists in MinIO console (http://localhost:9001)

### Presigned URL Expired

**Cause**: URLs expire after 1 hour

**Solution**:
- Request new presigned URL
- Adjust expiration time in `getPresignedPutUrl` call

## Performance Optimization

### Direct Upload Benefits

- Files upload directly to MinIO (no server proxy)
- Reduces server load
- Faster upload speeds
- Progress tracking in browser

### Caching

- File metadata cached in database
- Public URLs can be cached
- Presigned URLs should not be cached (expire after 1 hour)

## Best Practices

### File Organization

1. Use meaningful folder structures
2. Keep file names descriptive
3. Avoid special characters in file names
4. Use appropriate MIME types

### Security

1. Always verify file ownership
2. Use presigned URLs for temporary access
3. Set appropriate expiration times
4. Log all file operations
5. Validate file types on upload

### Error Handling

1. Provide user-friendly error messages
2. Log errors for debugging
3. Handle network failures gracefully
4. Show upload progress and status

## API Reference

### Server Actions

All actions return `ActionResult<T>`:
```typescript
type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

#### Upload Operations

- `getUploadPresignedUrl(input)` - Get presigned URL for upload
- `confirmUpload(input)` - Confirm upload and save metadata

#### Download Operations

- `getDownloadUrl(input)` - Get presigned URL for download
- `getPublicUrl(input)` - Get public URL for file

#### File Management

- `listFolder(input)` - List files and folders
- `createFolder(input)` - Create new folder
- `deleteFile(input)` - Delete file
- `deleteFolder(input)` - Delete folder and contents
- `renameFileOrFolder(input)` - Rename file or folder
- `moveFile(input)` - Move file to different path

## Integration Examples

### Upload with Progress

```typescript
const uploadFile = async (file: File) => {
  // Get presigned URL
  const { data } = await getUploadPresignedUrl({
    path: "/documents",
    name: file.name,
    contentType: file.type
  });
  
  // Upload with progress
  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    const progress = (e.loaded / e.total) * 100;
    console.log(`Upload progress: ${progress}%`);
  };
  
  xhr.onload = async () => {
    if (xhr.status === 200) {
      await confirmUpload({
        key: data.key,
        size: file.size,
        mimeType: file.type,
        etag: xhr.getResponseHeader("ETag")
      });
    }
  };
  
  xhr.open("PUT", data.url);
  xhr.send(file);
};
```

### List Files with Filtering

```typescript
const { data } = await listFolder({ path: "/documents" });
const pdfFiles = data.files.filter(f => f.mimeType === "application/pdf");
```

### Download File

```typescript
const downloadFile = async (storageKey: string) => {
  const { data } = await getDownloadUrl({ key: storageKey });
  window.open(data.url, "_blank");
};
```

## Maintenance

### Backup Files

Files are backed up as part of the full backup system. See `BACKUP_SYSTEM.md` for details.

### Clean Up Orphaned Files

Run periodic cleanup to remove files in MinIO that don't have database records:

```typescript
// TODO: Implement cleanup script
```

### Monitor Storage Usage

Track storage usage per user:

```sql
SELECT 
  u.email,
  COUNT(f.id) as file_count,
  SUM(f.size) as total_size
FROM "File" f
JOIN "User" u ON f."ownerId" = u.id
GROUP BY u.email
ORDER BY total_size DESC;
```

## Future Enhancements

- [ ] File sharing between users
- [ ] File versioning
- [ ] Thumbnail generation for images
- [ ] File search and filtering
- [ ] Bulk operations
- [ ] Storage quotas per user
- [ ] File compression
- [ ] Virus scanning
- [ ] File preview for more types
- [ ] Collaborative editing

## Related Documentation

- [MinIO Documentation](https://min.io/docs/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [User Log System](./README_USER_LOG_USAGE.md)
- [Backup System](./BACKUP_SYSTEM.md)

