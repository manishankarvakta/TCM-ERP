"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantContext, verifyTenantAccess, verifyParentTenantAccess } from "@/lib/tenant-context";
import { storage } from "@/lib/storage";
import { createUserLog } from "@/lib/user-log";
import { z } from "zod";

/**
 * Response type for server actions
 */
type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Helper function to verify user is authenticated
 */
async function getAuthenticatedUser(): Promise<{ id: string }> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User must be logged in");
  }
  
  return { id: session.user.id };
}

/**
 * Helper function to verify file ownership
 */
async function verifyFileOwnership(
  userId: string,
  storageKey: string
): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { storageKey },
    select: { ownerId: true },
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (file.ownerId !== userId) {
    throw new Error("Unauthorized: You don't have permission to access this file");
  }
}

/**
 * Helper function to build storage key from user ID, path, and filename
 */
function buildStorageKey(userId: string, path: string, filename: string): string {
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, ""); // Remove leading/trailing slashes
  const normalizedFilename = filename.replace(/^\/+/, ""); // Remove leading slashes
  
  if (normalizedPath) {
    return `${userId}/${normalizedPath}/${normalizedFilename}`;
  }
  return `${userId}/${normalizedFilename}`;
}

import { getSetting } from "@/app/(dashboard)/dashboard/settings/_actions/settings.action";

/**
 * Upload file directly via server (no presigned URLs)
 * This allows MinIO to remain internal-only like PostgreSQL
 */
export async function uploadFileServerSide(input: {
  path: string;
  name: string;
  fileData: string; // Base64 encoded file data
  contentType: string;
  size: number;
}): Promise<ActionResult<{ fileId: string; key: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { path, name, fileData, contentType, size } = input;

    // Fetch system settings for validation
    const systemSettings = await getSetting("system", "general");
    
    // Validate File Size
    if (systemSettings.success && systemSettings.setting?.settings) {
      const settings = systemSettings.setting.settings as Record<string, any>;
      const maxFileSizeMB = Number(settings.fileSizeLimit) || 50; // Default 50MB
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
      
      if (size > maxFileSizeBytes) {
        throw new Error(`File size exceeds the limit of ${maxFileSizeMB}MB`);
      }

      // Validate File Type
      const supportedExtensions = (settings.supportedFileTypes as string || "")
        .split(",")
        .map((ext: string) => ext.trim().toLowerCase())
        .filter(Boolean);

      if (supportedExtensions.length > 0) {
        const fileExtension = name.split(".").pop()?.toLowerCase();
        // Check if extension exists and is in the allowed list
        // We also check against contentType for extra safety if needed, but extension is standard for user-facing validation
        if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
             throw new Error(`File type .${fileExtension} is not supported. Allowed: ${supportedExtensions.join(", ")}`);
        }
      }
    }

    // Build storage key
    const storageKey = buildStorageKey(user.id, path, name);

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');

    // Save to local storage internally
    await storage.saveFile(storageKey, buffer);

    // Check if file already exists
    const existingFile = await prisma.file.findUnique({
      where: { storageKey },
    });

    let file;
    if (existingFile) {
      // Update existing file
      file = await prisma.file.update({
        where: { storageKey },
        data: {
          size,
          mimeType: contentType,
          updatedAt: new Date(),
        },
      });

      await createUserLog({
        userId: user.id,
        action: "FILE_UPDATED",
        details: `File updated: ${name} at path: ${path || "/"}`,
        metadata: { fileId: file.id, path, name, size, mimeType: contentType },
      });
    } else {
      // Create new file record
      file = await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name,
          path: path || "/",
          storageKey,
          size,
          mimeType: contentType,
          isFolder: false,
        },
      });

      await createUserLog({
        userId: user.id,
        action: "FILE_UPLOADED",
        details: `File uploaded: ${name} at path: ${path || "/"}`,
        metadata: { fileId: file.id, path, name, size, mimeType: contentType },
      });
    }

    return {
      success: true,
      data: { fileId: file.id, key: storageKey },
    };
  } catch (error) {
    console.error("uploadFileServerSide error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Get presigned URL for uploading a file (DEPRECATED - use uploadFileServerSide)
 * Kept for backward compatibility
 */
export async function getUploadPresignedUrl(input: {
  path: string;
  name: string;
  contentType?: string;
}): Promise<ActionResult<{ url: string; key: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { path, name, contentType } = input;

    // Build storage key
    const storageKey = buildStorageKey(user.id, path, name);

    // NOTE: Presigned URLs are not supported for local filesystem storage.
    // This is a legacy function and should be avoided.
    throw new Error("Presigned URLs are not supported with local storage. Please use uploadFileServerSide.");

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_UPLOAD_URL_GENERATED",
      details: `Generated upload URL for file: ${name} at path: ${path}`,
      metadata: { path, name, contentType, storageKey },
    });

    return {
      success: true,
      data: { url: "", key: storageKey },
    };
  } catch (error) {
    console.error("getUploadPresignedUrl error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate upload URL",
    };
  }
}

/**
 * Confirm file upload and save metadata to database
 */
export async function confirmUpload(input: {
  key: string;
  size: number;
  mimeType: string;
  etag?: string;
}): Promise<ActionResult<{ fileId: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { key, size, mimeType, etag } = input;

    // Verify the key belongs to this user
    if (!key.startsWith(`${user.id}/`)) {
      throw new Error("Unauthorized: Invalid file key");
    }

    // Extract path and filename from storage key
    const parts = key.replace(`${user.id}/`, "").split("/");
    const filename = parts[parts.length - 1];
    const path = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

    // Check if file already exists
    const existingFile = await prisma.file.findUnique({
      where: { storageKey: key },
    });

    let file;
    if (existingFile) {
      // Update existing file
      file = await prisma.file.update({
        where: { storageKey: key },
        data: {
          size,
          mimeType,
          etag: etag || null,
          updatedAt: new Date(),
        },
      });

      // Log the action
      await createUserLog({
        userId: user.id,
        action: "FILE_UPDATED",
        details: `File updated: ${filename} at path: ${path || "/"}`,
        metadata: { fileId: file.id, path, name: filename, size, mimeType },
      });
    } else {
      // Create new file record
      file = await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name: filename,
          path: path || "/",
          storageKey: key,
          size,
          mimeType,
          isFolder: false,
          etag: etag || null,
        },
      });

      // Log the action
      await createUserLog({
        userId: user.id,
        action: "FILE_UPLOADED",
        details: `File uploaded: ${filename} at path: ${path || "/"}`,
        metadata: { fileId: file.id, path, name: filename, size, mimeType },
      });
    }

    return {
      success: true,
      data: { fileId: file.id },
    };
  } catch (error) {
    console.error("confirmUpload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm upload",
    };
  }
}

/**
 * List files and folders in a directory
 */
/**
 * List files and folders in a directory
 */
export async function listFolder(input: {
  path: string;
  filterUserId?: string; // Admin only: filter by user ID
}): Promise<ActionResult<{ files: Array<{
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  isFolder: boolean;
  storageKey?: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}> }>> {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    const user = session.user;
    const { path, filterUserId } = input;

    // Determine target user ID
    let targetUserId = user.id;

    // If filterUserId is provided, check if current user is admin
    if (filterUserId && filterUserId !== user.id) {
        // Fetch user role to verify admin status
        // const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        // Assuming session.user.role is available or we check DB. 
        // Let's check DB to be safe as session might be stale or role not in session types here nicely without casting
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        
        if (dbUser?.role === "ADMIN" || dbUser?.role === "SUPER_ADMIN") {
            targetUserId = filterUserId;
        } else {
             // If not admin, ignore filter and stick to own files (or throw error? sticking to own files is safer default to prevent leakage)
             console.warn(`User ${user.id} tried to access files of ${filterUserId} without admin privileges.`);
        }
    }

    // Normalize path
    const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
    
    // Get files from database that match the path for the target user
    console.log(`[listFolder] TargetUser: ${targetUserId}, Path: "${normalizedPath || "/"}"`);
    
    const files = await prisma.file.findMany({
      where: {
        ownerId: targetUserId,
        path: normalizedPath || "/",
      },
      select: {
        id: true,
        name: true,
        path: true,
        storageKey: true,
        size: true,
        mimeType: true,
        isFolder: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { isFolder: "desc" }, // Folders first
        { name: "asc" }, // Then alphabetical
      ],
    });

    // Normalize storageKey nulls to undefined for compatibility with UI types
    // console.log(`[listFolder] Found ${files.length} files.`);
    
    const sanitizedFiles = files.map((file) => ({
      ...file,
      owner: file.User,
      User: undefined,
      storageKey: file.storageKey || undefined,
    }));

    // Log the action (only if listing own files to avoid spamming logs for admin browsing?)
    // Or log everything. Let's log.
    await createUserLog({
      userId: user.id,
      action: "FOLDER_LISTED",
      details: `Listed folder contents: ${path || "/"} for user ${targetUserId}`,
      metadata: { path: normalizedPath || "/", fileCount: sanitizedFiles.length, targetUserId },
    });

    return {
      success: true,
      data: { files: sanitizedFiles as typeof sanitizedFiles & { storageKey?: string }[] },
    };
  } catch (error) {
    console.error("listFolder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list folder",
      data: { files: [] },
    };
  }
}

/**
 * Delete a file
 */
export async function deleteFile(input: {
  key: string;
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const { key } = input;

    // Verify ownership
    await verifyFileOwnership(user.id, key);

    // Get file info for logging
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { id: true, name: true, path: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Delete from local storage
    await storage.deleteFile(key);

    // Delete from database
    await prisma.file.delete({
      where: { storageKey: key },
    });

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_DELETED",
      details: `File deleted: ${file.name} from path: ${file.path}`,
      metadata: { fileId: file.id, path: file.path, name: file.name, storageKey: key },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}

/**
 * Copy a file
 */
export async function copyFile(input: {
  sourceKey: string;
  destKey: string;
}): Promise<ActionResult<{ fileId: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { sourceKey, destKey } = input;

    // Verify source file ownership
    await verifyFileOwnership(user.id, sourceKey);

    // Verify destination key belongs to user
    if (!destKey.startsWith(`${user.id}/`)) {
      throw new Error("Unauthorized: Invalid destination key");
    }

    // Get source file info
    const sourceFile = await prisma.file.findUnique({
      where: { storageKey: sourceKey },
      select: { name: true, path: true, size: true, mimeType: true, isFolder: true },
    });

    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Copy in local storage
    if (sourceFile.isFolder) {
      // For folders, we need to copy all objects recursively
      const sourcePrefix = sourceKey.endsWith("/") ? sourceKey : `${sourceKey}/`;
      const destPrefix = destKey.endsWith("/") ? destKey : `${destKey}/`;
      
      // List all objects in the source folder
      const objects = await storage.listFiles(sourcePrefix);
      
      // Copy each object
      for (const objectKey of objects) {
        const relativePath = objectKey.replace(sourcePrefix, "");
        const newKey = `${destPrefix}${relativePath}`;
        await storage.copyFile(objectKey, newKey);
      }
      
      // Copy the folder marker itself if it exists
      try {
        await storage.copyFile(sourceKey, destKey);
      } catch {
        // Ignore if folder marker doesn't exist
      }
    } else {
      // For files, just copy the object
      await storage.copyFile(sourceKey, destKey);
    }

    // Extract destination path and filename
    const destParts = destKey.replace(`${user.id}/`, "").split("/");
    const destFilename = destParts[destParts.length - 1];
    const destPath = destParts.length > 1 ? destParts.slice(0, -1).join("/") : "";

    // For folders, we need to copy all file records recursively
    if (sourceFile.isFolder) {
      const sourcePrefix = sourceKey.endsWith("/") ? sourceKey : `${sourceKey}/`;
      const destPrefix = destKey.endsWith("/") ? destKey : `${destKey}/`;
      
      // Get all files in the source folder
      const sourceFiles = await prisma.file.findMany({
        where: {
          ownerId: user.id,
          storageKey: {
            startsWith: sourcePrefix,
          },
        },
      });
      
      // Copy each file record
      for (const sourceFileRecord of sourceFiles) {
        const relativePath = sourceFileRecord.storageKey.replace(sourcePrefix, "");
        const newStorageKey = `${destPrefix}${relativePath}`;
        const newPath = newStorageKey.replace(`${user.id}/`, "").split("/").slice(0, -1).join("/") || "/";
        const newName = newStorageKey.split("/").pop() || sourceFileRecord.name;
        
        await prisma.file.create({
// @ts-expect-error - Legacy compatibility
          data: {
            ownerId: user.id,
            name: newName,
            path: newPath,
            storageKey: newStorageKey,
            size: sourceFileRecord.size,
            mimeType: sourceFileRecord.mimeType,
            isFolder: sourceFileRecord.isFolder,
          },
        });
      }
      
      // Create the folder record itself
      await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: 0,
          mimeType: "application/x-directory",
          isFolder: true,
        },
      });
    } else {
      // Create new file record for destination
      await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: sourceFile.size,
          mimeType: sourceFile.mimeType,
          isFolder: false,
        },
      });
    }
    
    // Get the created file for return value
    const newFile = await prisma.file.findUnique({
      where: { storageKey: destKey },
    });
    
    if (!newFile) {
      throw new Error("Failed to create file record");
    }

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_COPIED",
      details: `File copied: ${sourceFile.name} to ${destFilename}`,
      metadata: {
        sourceKey,
        destKey,
        sourcePath: sourceFile.path,
        destPath: destPath || "/",
        fileId: newFile.id,
      },
    });

    return {
      success: true,
      data: { fileId: newFile.id },
    };
  } catch (error) {
    console.error("copyFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to copy file",
    };
  }
}

/**
 * Move a file
 */
export async function moveFile(input: {
  sourceKey: string;
  destKey: string;
}): Promise<ActionResult<{ fileId: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { sourceKey, destKey } = input;

    // Verify source file ownership
    await verifyFileOwnership(user.id, sourceKey);

    // Verify destination key belongs to user
    if (!destKey.startsWith(`${user.id}/`)) {
      throw new Error("Unauthorized: Invalid destination key");
    }

    // Get source file info
    const sourceFile = await prisma.file.findUnique({
      where: { storageKey: sourceKey },
      select: { id: true, name: true, path: true, size: true, mimeType: true, isFolder: true },
    });

    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Move in local storage
    if (sourceFile.isFolder) {
      // For folders, we need to move all objects recursively
      const sourcePrefix = sourceKey.endsWith("/") ? sourceKey : `${sourceKey}/`;
      const destPrefix = destKey.endsWith("/") ? destKey : `${destKey}/`;
      
      // List all objects in the source folder
      const objects = await storage.listFiles(sourcePrefix);
      
      // Move each object
      for (const objectKey of objects) {
        const relativePath = objectKey.replace(sourcePrefix, "");
        const newKey = `${destPrefix}${relativePath}`;
        await storage.moveFile(objectKey, newKey);
      }
      
      // Move the folder marker itself if it exists
      try {
        await storage.moveFile(sourceKey, destKey);
      } catch {
        // Ignore if folder marker doesn't exist
      }
    } else {
      // For files, just move the object
      await storage.moveFile(sourceKey, destKey);
    }

    // Extract destination path and filename
    const destParts = destKey.replace(`${user.id}/`, "").split("/");
    const destFilename = destParts[destParts.length - 1];
    const destPath = destParts.length > 1 ? destParts.slice(0, -1).join("/") : "";

    // For folders, we need to move all file records recursively
    if (sourceFile.isFolder) {
      const sourcePrefix = sourceKey.endsWith("/") ? sourceKey : `${sourceKey}/`;
      const destPrefix = destKey.endsWith("/") ? destKey : `${destKey}/`;
      
      // Get all files in the source folder
      const sourceFiles = await prisma.file.findMany({
        where: {
          ownerId: user.id,
          storageKey: {
            startsWith: sourcePrefix,
          },
        },
      });
      
      // Move each file record
      for (const sourceFileRecord of sourceFiles) {
        const relativePath = sourceFileRecord.storageKey.replace(sourcePrefix, "");
        const newStorageKey = `${destPrefix}${relativePath}`;
        const newPath = newStorageKey.replace(`${user.id}/`, "").split("/").slice(0, -1).join("/") || "/";
        const newName = newStorageKey.split("/").pop() || sourceFileRecord.name;
        
        // Delete old record
        await prisma.file.delete({
          where: { storageKey: sourceFileRecord.storageKey },
        });
        
        // Create new record
        await prisma.file.create({
// @ts-expect-error - Legacy compatibility
          data: {
            ownerId: user.id,
            name: newName,
            path: newPath,
            storageKey: newStorageKey,
            size: sourceFileRecord.size,
            mimeType: sourceFileRecord.mimeType,
            isFolder: sourceFileRecord.isFolder,
          },
        });
      }
      
      // Delete old folder record and create new one
      await prisma.file.delete({
        where: { storageKey: sourceKey },
      });
      
      await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: 0,
          mimeType: "application/x-directory",
          isFolder: true,
        },
      });
    } else {
      // Delete old file record and create new one (since storageKey is unique)
      await prisma.file.delete({
        where: { storageKey: sourceKey },
      });

      await prisma.file.create({
// @ts-expect-error - Legacy compatibility
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: sourceFile.size,
          mimeType: sourceFile.mimeType,
          isFolder: false,
        },
      });
    }
    
    // Get the updated file for return value
    const updatedFile = await prisma.file.findUnique({
      where: { storageKey: destKey },
    });
    
    if (!updatedFile) {
      throw new Error("Failed to update file record");
    }

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_MOVED",
      details: `File moved: ${sourceFile.name} from ${sourceFile.path} to ${destPath || "/"}`,
      metadata: {
        sourceKey,
        destKey,
        sourcePath: sourceFile.path,
        destPath: destPath || "/",
        fileId: updatedFile.id,
      },
    });

    return {
      success: true,
      data: { fileId: updatedFile.id },
    };
  } catch (error) {
    console.error("moveFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move file",
    };
  }
}

/**
 * Create a folder
 */
export async function createFolder(input: {
  path: string;
  name: string;
}): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const { path, name } = input;

    // Normalize path
    const normalizedPath = path === "/" ? "" : path.replace(/^\/+/, "").replace(/\/+$/, "");
    const storageKey = `${user.id}/${normalizedPath}${normalizedPath ? "/" : ""}${name}/`;

    // Create folder in local storage
    await storage.createDirectory(storageKey);

    // Create folder record in database
    await prisma.file.create({
// @ts-expect-error - Legacy compatibility
      data: {
        ownerId: user.id,
        name,
        path: normalizedPath || "/",
        storageKey,
        size: 0,
        mimeType: "application/x-directory",
        isFolder: true,
      },
    });

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FOLDER_CREATED",
      details: `Folder created: ${name} at path: ${path || "/"}`,
      metadata: { path: normalizedPath || "/", name, storageKey },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("createFolder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

/**
 * Rename a file or folder
 */
export async function renameFileOrFolder(input: {
  key: string;
  newName: string;
}): Promise<ActionResult<{ fileId: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { key, newName } = input;

    // Verify ownership
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { id: true, name: true, path: true, isFolder: true, ownerId: true, size: true, mimeType: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    if (file.ownerId !== user.id) {
      throw new Error("Unauthorized: You don't have permission to rename this file");
    }

    // Build new storage key
    const newStorageKey = buildStorageKey(user.id, file.path, newName);

    // Check if new name already exists
    const existingFile = await prisma.file.findUnique({
      where: { storageKey: newStorageKey },
    });

    if (existingFile) {
      throw new Error("A file or folder with this name already exists");
    }

    // Rename in local storage
    if (file.isFolder) {
      // For folders, we need to move the directory
      await storage.moveFile(key, newStorageKey);
    } else {
      // For files, just move the file
      await storage.moveFile(key, newStorageKey);
    }

    // Delete old record and create new one (since storageKey is unique)
    await prisma.file.delete({
      where: { storageKey: key },
    });

    const updatedFile = await prisma.file.create({
// @ts-expect-error - Legacy compatibility
      data: {
        ownerId: user.id,
        name: newName,
        path: file.path,
        storageKey: newStorageKey,
        size: file.size || 0,
        mimeType: file.mimeType || (file.isFolder ? "application/x-directory" : "application/octet-stream"),
        isFolder: file.isFolder,
      },
    });

    // Log the action
    await createUserLog({
      userId: user.id,
      action: file.isFolder ? "FOLDER_RENAMED" : "FILE_RENAMED",
      details: `${file.isFolder ? "Folder" : "File"} renamed: ${file.name} to ${newName}`,
      metadata: {
        oldName: file.name,
        newName,
        oldKey: key,
        newKey: newStorageKey,
        path: file.path,
        fileId: updatedFile.id,
      },
    });

    return {
      success: true,
      data: { fileId: updatedFile.id },
    };
  } catch (error) {
    console.error("renameFileOrFolder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to rename file or folder",
    };
  }
}

/**
 * Get download URL for a file
 * Returns API proxy URL that fetches from MinIO internally
 */
export async function getDownloadUrl(input: {
  key: string;
  expiresIn?: number;
}): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { key, expiresIn = 3600 } = input;

    // Verify ownership
    await verifyFileOwnership(user.id, key);

    // Get file info for logging
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { name: true, path: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${appUrl}/api/files/${key}?download=1`;

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_DOWNLOAD_URL_GENERATED",
      details: `Generated download URL for file: ${file.name}`,
      metadata: {
        path: file.path,
        name: file.name,
        storageKey: key,
        expiresIn,
        mode: "proxy",
      },
    });

    return {
      success: true,
      data: { url },
    };
  } catch (error) {
    console.error("getDownloadUrl error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate download URL",
    };
  }
}

/**
 * Get public URL for a file
 * Returns API proxy URL that fetches from MinIO internally
 */
export async function getPublicUrl(input: {
  key: string;
}): Promise<ActionResult<{ url: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { key } = input;

    // Verify ownership
    await verifyFileOwnership(user.id, key);

    // Get file info for logging
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { name: true, path: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Generate API proxy URL 
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${appUrl}/api/files/${key}`;

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FILE_PUBLIC_URL_GENERATED",
      details: `Generated public URL for file: ${file.name}`,
      metadata: { path: file.path, name: file.name, storageKey: key },
    });

    return {
      success: true,
      data: { url },
    };
  } catch (error) {
    console.error("getPublicUrl error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate public URL",
    };
  }
}

