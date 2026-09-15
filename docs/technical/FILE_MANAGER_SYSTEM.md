# File Manager System Documentation

## Overview

The File Manager System provides a robust solution for file storage, management, and sharing using a **Local Persistent Storage** backend. Files are stored directly on the server's filesystem within a Docker-managed volume, providing high performance and simplified infrastructure.

## Architecture

### Components

1.  **Local Filesystem Storage**: Files are stored in `/app/uploads` inside the container, which is bound to `./volumes/uploads` on the host.
2.  **Database (PostgreSQL)**: Stores file metadata, ownership information, and hierarchical folder structure.
3.  **Server Actions**: Handle file operations, security verification, and metadata synchronization.
4.  **Client Components**: Provide a modern UI for file management, uploading, and previews.

### Storage Structure

Files are organized on disk using the following key structure:
```
{userId}/{path}/{filename}
```

Example:
```
cm123abc/documents/report.pdf
cm123abc/images/photo.jpg
```

## Configuration

### Docker Volume Mapping

In `docker-compose.yml`, the application container maps a host directory to the internal uploads path:

```yaml
services:
  fferp-app:
    # ... other config
    volumes:
      - ./volumes/uploads:/app/uploads
```

### File Upload Limit

The system supports large file uploads (up to 50MB) through server-side configuration in `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};
```

## Core Features

### 1. File Upload

Files are uploaded via Next.js Server Actions using a Base64-encoded payload.

**Server Action** (`app/actions/files.ts`):
```typescript
export async function uploadFileServerSide(input: {
  path: string;
  name: string;
  fileData: string; // Base64 encoded file data
  contentType: string;
  size: number;
})
```

**Client Component** (`components/UploadDialog.tsx`):
1.  Converts the selected file to a Base64 string.
2.  Sends the data to the server action.
3.  Server saves the binary buffer to the local disk and updates the database.

### 2. File Download & Serving

Files are served through a secure proxy route to ensure authorization.

**API Route**: `/api/files/[...key]/route.ts`

**Flow**:
1.  Client requests `https://app.com/api/files/{key}`.
2.  The API route awaits the parameters (Next.js 16 requirement).
3.  The system verifies user authentication and file ownership via Prisma.
4.  If authorized, the file is read from the local disk using Node.js `fs/promises`.
5.  The file is returned with the correct `Content-Type` and security headers.

### 3. File Management

All management operations are handled by server actions in `app/actions/files.ts`:

-   **List Files**: `listFolder({ path })` fetches metadata from Prisma.
-   **Rename**: `renameFileOrFolder({ key, newName })` renames the file on disk and updates the database record.
-   **Move**: `moveFile({ sourceKey, destKey })` moves files or directories across the storage system.
-   **Delete**: `deleteFile({ key })` removes the file from disk and deletes the database record.

## Security

### Authentication & Authorization
-   **Session Check**: Every action verifies the user session via `auth()`.
-   **Ownership Verification**: Before any read/write/delete operation, the system checks if the `ownerId` in the database matches the current user's ID.
-   **Path Isolation**: Files are stored in user-specific root folders (`{userId}/...`), preventing cross-user access at the filesystem level.

## Troubleshooting

### "a.get is not a function"
This error occurred during the transition from `FormData` to Base64. Ensure all client components are sending a plain object with a `fileData` string instead of `FormData`.

### File Previews Not Showing
In Next.js 15+, `context.params` in API routes is a Promise and must be awaited:
```typescript
const { key } = await context.params;
```

### Permission Denied (Docker)
Ensure the Docker user has write access to the uploads volume:
```bash
docker exec -u root fferp-app chown -R nextjs:nodejs /app/uploads
```
