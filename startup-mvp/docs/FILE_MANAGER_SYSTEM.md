# File Manager System Documentation (Local Storage)

## 1. Overview
The File Manager system has been fully migrated from MinIO/S3 object storage to a **Local Persistent Storage** architecture. It provides a hierarchical file and folder management system integrated with the application's RBAC (Role-Based Access Control).

## 2. Architecture

### 2.1 Storage Layer (`lib/storage.ts`)
The system uses a unified storage abstraction layer that interacts directly with the server's filesystem.
- **Root Directory**: Defined by the `UPLOAD_DIR` environment variable (defaults to `/app/uploads` in Docker).
- **Volume Persistence**: In production, this directory is mapped to a Docker volume (`./volumes/uploads`) to ensure data persists across container restarts.

### 2.2 Metadata Layer (Prisma/PostgreSQL)
While files are stored on disk, their metadata is managed in the database:
- **`Folder` Model**: Manages the virtual directory tree.
- **`File` Model**: Stores file details (name, size, mimeType) and the `storageKey`.
- **`storageKey`**: The relative path on disk where the file is physically located.

## 3. Core Workflows

### 3.1 File Upload
1. **Client**: Reads the file and converts it to a Base64-encoded string.
2. **Server Action**:
    - Decodes the Base64 data into a Node.js `Buffer`.
    - Generates a unique `storageKey` based on the user ID and path.
    - Uses `storage.saveFile(key, buffer)` to write the file to the `UPLOAD_DIR`.
    - Creates a record in the `File` table.

### 3.2 File Retrieval & Preview
Files are not exposed directly via a public URL for security reasons.
1. **Request**: Handled by the API route `/api/files/[...key]`.
2. **Authorization**:
    - Verifies the user's session.
    - Checks the `File` table to ensure the requesting user owns the file.
3. **Delivery**:
    - If authorized, `storage.readFile(key)` fetches the buffer.
    - The server returns a `NextResponse` with the appropriate `Content-Type` and security headers.

### 3.3 Folder Management
- **Create**: `storage.createDirectory(key)` ensures the physical path exists.
- **Rename/Move**: `storage.moveFile(oldKey, newKey)` performs a filesystem move operation and updates all related database records (including children for folders).
- **Delete**: `storage.deleteFile(key)` performs a recursive deletion of the path on disk and removes the database entries.

## 4. Integration with Backup System
The backup system is fully synchronized with the file manager:
- **Backup**: Recursively reads the `UPLOAD_DIR` and packages all user files into a ZIP archive.
- **Restore**: Clears the current `UPLOAD_DIR` and repopulates it from the backup archive, ensuring the filesystem stays in sync with the restored database.

## 5. Security & Isolation
- **User Isolation**: Files are stored under user-specific prefixes (`{userId}/...`) to prevent cross-user data leakage.
- **Path Sanitization**: All keys are sanitized to prevent directory traversal attacks.
- **RBAC**: Access to the File Manager UI is controlled via the standard permission system.

## 6. Technical Specifications
- **Max File Size**: 50MB (configured in `next.config.ts`).
- **Storage Strategy**: Host-bound Docker volumes.
- **Compression**: Backups use standard ZIP compression (Deflate).

---
*Last Updated: May 2026*
