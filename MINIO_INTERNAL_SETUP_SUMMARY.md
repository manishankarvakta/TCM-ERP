# MinIO Internal-Only Setup - Implementation Summary

## Overview

Successfully converted MinIO from public access (with presigned URLs) to **internal-only access** via Docker network, similar to how PostgreSQL operates. This eliminates the need for a public MinIO domain and resolves Mixed Content errors.

## What Changed

### Architecture Shift

**Before (Presigned URLs):**
```
Browser → Get presigned URL from App → Upload directly to MinIO (http://espacio-minio:9000) ❌
```
- Required MinIO to be publicly accessible
- Caused Mixed Content errors on HTTPS sites
- Needed domain configuration

**After (Server-Side Proxy):**
```
Browser → Upload to Next.js API → Next.js uploads to MinIO internally ✅
Browser → Request file from Next.js API → Next.js fetches from MinIO internally ✅
```
- MinIO stays internal (like PostgreSQL)
- No Mixed Content errors
- No domain configuration needed
- Works seamlessly in both local and Dokploy environments

## Files Modified

### 1. `docker-compose-dokploy.yml`
**Changes:**
- Updated comments to reflect internal-only architecture
- Changed default bucket name from `startup-mvp-files` to `espacio-files`
- Clarified that `MINIO_PUBLIC_URL` is for internal use only

**Key Configuration:**
```yaml
MINIO_ENDPOINT: espacio-minio  # Internal Docker service name
MINIO_PORT: 9000
MINIO_USE_SSL: false
MINIO_PUBLIC_URL: ${MINIO_PUBLIC_URL:-http://espacio-minio:9000}  # Internal only
```

### 2. `env.docker.example`
**Changes:**
- Added documentation explaining local vs production setup
- Clarified that Dokploy uses internal network (no public domain needed)

**Configuration:**
```bash
# Local development: Use localhost (MinIO port is exposed)
MINIO_PUBLIC_URL=http://localhost:9000

# Dokploy/Production: Use internal Docker network
MINIO_PUBLIC_URL=http://espacio-minio:9000
```

### 3. `startup-mvp/app/actions/files.ts`
**Changes:**
- Added new `uploadFileServerSide()` function for direct server-side uploads
- Modified `getPublicUrl()` to return API proxy URLs instead of MinIO URLs
- Kept `getUploadPresignedUrl()` for backward compatibility (marked as deprecated)

**New Function:**
```typescript
export async function uploadFileServerSide(input: {
  path: string;
  name: string;
  fileData: string; // Base64 encoded
  contentType: string;
  size: number;
}): Promise<ActionResult<{ fileId: string; key: string }>>
```

**Updated Function:**
```typescript
// Now returns: https://app.espaciobd.com/api/files/user123/file.png
// Instead of: http://espacio-minio:9000/bucket/user123/file.png
export async function getPublicUrl(input: { key: string })
```

### 4. `startup-mvp/components/UploadDialog.tsx`
**Changes:**
- Replaced XHR direct upload with server action call
- Converts files to Base64 before sending to server
- Simulates progress for better UX

**Before:**
```typescript
// Get presigned URL → Upload directly to MinIO via XHR
const result = await getUploadPresignedUrl({...});
xhr.send(upload.file);
```

**After:**
```typescript
// Convert to base64 → Upload via server action
const fileData = buffer.toString('base64');
const result = await uploadFileServerSide({...});
```

### 5. `startup-mvp/components/files/UploadDialog.tsx`
**Changes:** Same as above

### 6. `startup-mvp/components/files/DirectUpload.tsx`
**Changes:** Same as above

### 7. `startup-mvp/app/api/files/[...key]/route.ts` *(NEW FILE)*
**Purpose:** Download proxy that fetches files from internal MinIO and streams to browser

**Functionality:**
- Authenticates user
- Verifies file ownership
- Fetches file from MinIO via internal S3 client
- Streams file to browser with appropriate headers
- Caches for 1 hour

**Example URL:**
```
https://app.espaciobd.com/api/files/user123/photo.jpg
↓
Next.js fetches from: http://espacio-minio:9000/espacio-files/user123/photo.jpg
↓
Streams to browser
```

## How It Works

### Upload Flow

1. **User selects file in browser**
2. **UploadDialog converts file to Base64**
   ```typescript
   const arrayBuffer = await file.arrayBuffer();
   const buffer = Buffer.from(arrayBuffer);
   const fileData = buffer.toString('base64');
   ```
3. **Server Action receives Base64 data**
   ```typescript
   uploadFileServerSide({ fileData, name, path, contentType, size })
   ```
4. **Next.js uploads to MinIO internally**
   ```typescript
   const buffer = Buffer.from(fileData, 'base64');
   await minio.uploadBuffer(storageKey, buffer, contentType);
   ```
5. **File metadata saved to PostgreSQL**
6. **Success response sent to browser**

### Download Flow

1. **Browser requests file URL**
   ```
   GET https://app.espaciobd.com/api/files/user123/photo.jpg
   ```
2. **Next.js API route authenticates user**
3. **Verifies file ownership in PostgreSQL**
4. **Fetches file from MinIO internally**
   ```typescript
   const command = new GetObjectCommand({ Bucket, Key });
   const response = await s3.send(command);
   ```
5. **Streams file to browser**
   ```typescript
   return new NextResponse(buffer, {
     headers: { "Content-Type": mimeType, ... }
   });
   ```

## Environment Variables

### For Dokploy (Production)

Set these in Dokploy UI:

```bash
# App URLs
NEXTAUTH_URL=https://app.espaciobd.com
NEXT_PUBLIC_APP_URL=https://app.espaciobd.com

# MinIO (Internal Only - NO PUBLIC DOMAIN NEEDED)
MINIO_PUBLIC_URL=http://espacio-minio:9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=your-secure-password
MINIO_BUCKET_NAME=espacio-files

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=startup_mvp
```

### For Local Development

In `.env` file:

```bash
# App URLs
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MinIO (Localhost - port is exposed)
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET_NAME=espacio-files
```

## Benefits

### ✅ Security
- MinIO never exposed to public internet
- All file access goes through authenticated Next.js API
- Consistent with PostgreSQL security model

### ✅ Simplicity
- No need to configure MinIO domain
- No SSL certificates for MinIO
- No CORS configuration for public access
- No DNS records needed

### ✅ Reliability
- No Mixed Content errors
- Works in any deployment environment
- Internal network is faster and more reliable

### ✅ Consistency
- Same architecture as PostgreSQL
- All external access goes through Next.js
- Centralized authentication and authorization

## Trade-offs

### ⚠️ Performance
- Files pass through Next.js (two hops instead of one)
- Slightly slower for very large files
- Impact is negligible for files < 100MB

### ⚠️ Server Load
- Next.js handles file streaming
- Uses more memory for concurrent uploads
- Not an issue for typical file sizes

## Testing

### Test Upload
1. Navigate to Files page
2. Click "Upload" button
3. Select a file
4. Verify upload completes successfully
5. Check that file appears in file list

### Test Download
1. Click on uploaded file
2. Verify file downloads/displays correctly
3. Check browser Network tab - URL should be:
   ```
   https://app.espaciobd.com/api/files/...
   ```
   NOT:
   ```
   http://espacio-minio:9000/...
   ```

### Verify Internal Connection
1. Check Docker logs:
   ```bash
   docker logs startup-mvp-app
   ```
2. Should NOT see any errors about MinIO connection
3. Should NOT see Mixed Content errors

## Rollback Plan

If you need to revert to presigned URLs:

1. Update components to use `getUploadPresignedUrl` instead of `uploadFileServerSide`
2. Restore XHR upload logic in UploadDialog components
3. Update `getPublicUrl` to return `minio.getPublicUrl(key)`
4. Set `MINIO_PUBLIC_URL=https://minio.espaciobd.com`
5. Configure MinIO with Traefik labels for public access

## Related Documentation

- [Docker Setup](docs/DOCKER_SETUP.md)
- [Dokploy Deployment](docs/DOKPLOY_DEPLOYMENT.md)
- [MinIO Troubleshooting](docs/MINIO_SETUP_TROUBLESHOOTING.md)
- [File Manager System](docs/FILE_MANAGER_SYSTEM.md)

## Deployment Checklist

- [x] Update docker-compose-dokploy.yml
- [x] Update env.docker.example
- [x] Add uploadFileServerSide action
- [x] Update all upload components
- [x] Add download proxy API route
- [x] Update getPublicUrl to use proxy
- [ ] Set environment variables in Dokploy UI
- [ ] Deploy updated code
- [ ] Test file upload
- [ ] Test file download
- [ ] Verify no Mixed Content errors

## Support

If you encounter issues:

1. **Check Docker logs:** `docker logs startup-mvp-app`
2. **Check MinIO logs:** `docker logs startup-mvp-minio`
3. **Verify environment variables are set correctly**
4. **Test with small file first (< 1MB)**
5. **Check browser console for errors**

---

**Implementation Date:** December 15, 2025  
**Status:** ✅ Complete - Ready for Deployment

