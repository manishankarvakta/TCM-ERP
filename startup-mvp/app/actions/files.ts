"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { createUserLog } from "@/lib/user-log";
import { url, z } from "zod";

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
  try {
    console.log("getAuthenticatedUser: Calling auth()...");
    const session = await auth();
    console.log("getAuthenticatedUser: session parsed:", session ? { id: session.user?.id, email: session.user?.email, role: session.user?.role } : "null");
    
    if (!session?.user?.id) {
      console.warn("getAuthenticatedUser: No user ID found in session");
      throw new Error("Unauthorized: User must be logged in");
    }
    
    return { id: session.user.id };
  } catch (error) {
    console.error("getAuthenticatedUser exception:", error);
    throw error;
  }
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

import { revalidatePath } from "next/cache";

export async function uploadFileServerSide(
  formData: FormData
): Promise<ActionResult<{ fileId: string; key: string }>> {
  try {
    console.log("uploadFileServerSide: Received FormData. Keys:", Array.from(formData.keys()));
    for (const key of formData.keys()) {
      const val = formData.get(key);
      console.log(`uploadFileServerSide: key="${key}" type="${typeof val}" isBlob=${val instanceof Blob} isFile=${val ? val.constructor.name : 'null'}`);
    }

    const file = formData.get("file") as File;
    const path = (formData.get("path") as string) || "";

    if (!file || (typeof file === "string")) {
      throw new Error("No file uploaded");
    }

    const name = file.name;
    const contentType = file.type || "application/octet-stream";
    const size = file.size;

    console.log("uploadFileServerSide started for file:", { name, path, contentType, size });
    
    console.log("uploadFileServerSide: Resolving authenticated user...");
    const user = await getAuthenticatedUser();
    console.log("uploadFileServerSide: User resolved as:", user.id);

    // Build storage key
    const storageKey = buildStorageKey(user.id, path, name);
    console.log("uploadFileServerSide: Storage key resolved as:", storageKey);

    // Convert Web File Blob to Node Buffer
    console.log("uploadFileServerSide: Converting file to arrayBuffer and buffer...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("uploadFileServerSide: Buffer created. Length:", buffer.length);

    // Upload to local storage internally
    console.log("uploadFileServerSide: Saving file to disk...");
    await storage.saveFile(storageKey, buffer);
    console.log("uploadFileServerSide: File successfully saved to disk.");

    // Check if file already exists
    console.log("uploadFileServerSide: Querying database for existing storage key...");
    const existingFile = await prisma.file.findUnique({
      where: { storageKey },
    });
    console.log("uploadFileServerSide: Existing file query result:", existingFile ? "Found" : "Not Found");

    let dbFile;
    if (existingFile) {
      // Update existing file
      console.log("uploadFileServerSide: Updating existing file record in DB...");
      dbFile = await prisma.file.update({
        where: { storageKey },
        data: {
          size,
          mimeType: contentType,
          updatedAt: new Date(),
        },
      });

      console.log("uploadFileServerSide: Creating user log for FILE_UPDATED...");
      await createUserLog({
        userId: user.id,
        action: "FILE_UPDATED",
        details: `File updated: ${name} at path: ${path || "/"}`,
        metadata: { fileId: dbFile.id, path, name, size, mimeType: contentType },
      });
    } else {
      // Create new file record
      console.log("uploadFileServerSide: Creating new file record in DB...");
      dbFile = await prisma.file.create({
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

      console.log("uploadFileServerSide: Creating user log for FILE_UPLOADED...");
      await createUserLog({
        userId: user.id,
        action: "FILE_UPLOADED",
        details: `File uploaded: ${name} at path: ${path || "/"}`,
        metadata: { fileId: dbFile.id, path, name, size, mimeType: contentType },
      });
    }

    // Revalidate the whole layout to ensure UI consistency
    console.log("uploadFileServerSide: Triggering layout revalidation...");
    revalidatePath("/", "layout");
    console.log("uploadFileServerSide: Layout revalidated successfully.");

    return {
      success: true,
      data: { fileId: dbFile.id, key: storageKey },
    };
  } catch (error) {
    console.error("CRITICAL EXCEPTION inside uploadFileServerSide:", error);
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
    // For now, we return a fake URL that won't work, or throw an error.
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

interface FileUsage {
  module: string;
  name: string;
  id: string;
}

export async function getFileUsages(storageKey: string): Promise<FileUsage[]> {
  const usages: FileUsage[] = [];

  const addUsage = (module: string, name: string | null | undefined, id: string) => {
    usages.push({
      module,
      name: name || "Unnamed",
      id,
    });
  };

  try {
    // 1. Check Users
    const users = await prisma.user.findMany({
      where: { image: { contains: storageKey } },
      select: { id: true, name: true, email: true }
    });
    users.forEach(u => addUsage("User", u.name || u.email, u.id));

    // 2. Check Items (featuredImage or images Json)
    const items = await prisma.item.findMany({
      select: { id: true, name: true, featuredImage: true, images: true }
    });
    items.forEach(item => {
      let isUsed = false;
      if (item.featuredImage && item.featuredImage.includes(storageKey)) {
        isUsed = true;
      } else if (item.images) {
        let imageArray: any[] = [];
        if (Array.isArray(item.images)) {
          imageArray = item.images;
        } else if (typeof item.images === "string") {
          try {
            imageArray = JSON.parse(item.images);
          } catch {}
        }
        if (Array.isArray(imageArray)) {
          isUsed = imageArray.some(img => {
            if (typeof img === "string") {
              return img.includes(storageKey);
            } else if (img && typeof img === "object" && img.url) {
              return img.url.includes(storageKey);
            }
            return false;
          });
        }
      }
      if (isUsed) {
        addUsage("Item", item.name, item.id);
      }
    });

    // 3. Check Employees
    const employees = await prisma.employee.findMany({
      where: { photo: { contains: storageKey } },
      select: { id: true, name: true }
    });
    employees.forEach(e => addUsage("Employee", e.name, e.id));

    // 4. Check Clients
    const clients = await prisma.client.findMany({
      where: { image: { contains: storageKey } },
      select: { id: true, name: true, company: true }
    });
    clients.forEach(c => addUsage("Client", c.name || c.company, c.id));

    // 5. Check Suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { image: { contains: storageKey } },
      select: { id: true, name: true, company: true }
    });
    suppliers.forEach(s => addUsage("Supplier", s.name || s.company, s.id));

    // 6. Check Purchases
    const purchases = await prisma.purchase.findMany({
      where: { attachmentUrl: { contains: storageKey } },
      select: { id: true, purchaseNumber: true }
    });
    purchases.forEach(p => addUsage("Purchase", p.purchaseNumber, p.id));

    // 7. Check Sales
    const sales = await prisma.sale.findMany({
      where: { attachmentUrl: { contains: storageKey } },
      select: { id: true, saleNumber: true }
    });
    sales.forEach(s => addUsage("Sale", s.saleNumber, s.id));

  } catch (error) {
    console.error("Error checking file usage:", error);
  }

  return usages;
}

async function getBulkFileUsages(storageKeys: string[]): Promise<Record<string, FileUsage[]>> {
  const usageMap: Record<string, FileUsage[]> = {};
  storageKeys.forEach(k => {
    usageMap[k] = [];
  });

  const addUsage = (key: string, module: string, name: string | null | undefined, id: string) => {
    if (usageMap[key]) {
      usageMap[key].push({
        module,
        name: name || "Unnamed",
        id,
      });
    }
  };

  try {
    // 1. Fetch Users
    const users = await prisma.user.findMany({
      where: { image: { not: null } },
      select: { id: true, name: true, email: true, image: true }
    });
    users.forEach(u => {
      const matchedKey = storageKeys.find(k => u.image?.includes(k));
      if (matchedKey) addUsage(matchedKey, "User", u.name || u.email, u.id);
    });

    // 2. Fetch Items
    const items = await prisma.item.findMany({
      select: { id: true, name: true, featuredImage: true, images: true }
    });
    items.forEach(item => {
      storageKeys.forEach(key => {
        let isUsed = false;
        if (item.featuredImage && item.featuredImage.includes(key)) {
          isUsed = true;
        } else if (item.images) {
          let imageArray: any[] = [];
          if (Array.isArray(item.images)) {
            imageArray = item.images;
          } else if (typeof item.images === "string") {
            try {
              imageArray = JSON.parse(item.images);
            } catch {}
          }
          if (Array.isArray(imageArray)) {
            isUsed = imageArray.some(img => {
              if (typeof img === "string") {
                return img.includes(key);
              } else if (img && typeof img === "object" && img.url) {
                return img.url.includes(key);
              }
              return false;
            });
          }
        }
        if (isUsed) {
          addUsage(key, "Item", item.name, item.id);
        }
      });
    });

    // 3. Fetch Employees
    const employees = await prisma.employee.findMany({
      where: { photo: { not: null } },
      select: { id: true, name: true, photo: true }
    });
    employees.forEach(e => {
      const matchedKey = storageKeys.find(k => e.photo?.includes(k));
      if (matchedKey) addUsage(matchedKey, "Employee", e.name, e.id);
    });

    // 4. Fetch Clients
    const clients = await prisma.client.findMany({
      where: { image: { not: null } },
      select: { id: true, name: true, company: true, image: true }
    });
    clients.forEach(c => {
      const matchedKey = storageKeys.find(k => c.image?.includes(k));
      if (matchedKey) addUsage(matchedKey, "Client", c.name || c.company, c.id);
    });

    // 5. Fetch Suppliers
    const suppliers = await prisma.supplier.findMany({
      where: { image: { not: null } },
      select: { id: true, name: true, company: true, image: true }
    });
    suppliers.forEach(s => {
      const matchedKey = storageKeys.find(k => s.image?.includes(k));
      if (matchedKey) addUsage(matchedKey, "Supplier", s.name || s.company, s.id);
    });

    // 6. Fetch Purchases
    const purchases = await prisma.purchase.findMany({
      where: { attachmentUrl: { not: null } },
      select: { id: true, purchaseNumber: true, attachmentUrl: true }
    });
    purchases.forEach(p => {
      const matchedKey = storageKeys.find(k => p.attachmentUrl?.includes(k));
      if (matchedKey) addUsage(matchedKey, "Purchase", p.purchaseNumber, p.id);
    });

    // 7. Fetch Sales
    const sales = await prisma.sale.findMany({
      where: { attachmentUrl: { not: null } },
      select: { id: true, saleNumber: true, attachmentUrl: true }
    });
    sales.forEach(s => {
      const matchedKey = storageKeys.find(k => s.attachmentUrl?.includes(k));
      if (matchedKey) addUsage(matchedKey, "Sale", s.saleNumber, s.id);
    });

  } catch (error) {
    console.error("Error in getBulkFileUsages:", error);
  }

  return usageMap;
}

export async function listFolder(input: {
  path: string;
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
  usageCount?: number;
  usages?: FileUsage[] | string[];
  owner: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}> }>> {
  try {
    const user = await getAuthenticatedUser();
    const { path } = input;

    // Normalize path
    const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
    const prefix = normalizedPath ? `${user.id}/${normalizedPath}/` : `${user.id}/`;

    // Get files from database that match the path
    const files = await prisma.file.findMany({
      where: {
        ownerId: user.id,
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
        owner: {
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

    // Collect all non-null storage keys to run bulk usages scan
    const storageKeys = files
      .map(f => f.storageKey)
      .filter((key): key is string => !!key);

    const bulkUsages = await getBulkFileUsages(storageKeys);

    // Normalize storageKey nulls to undefined for compatibility with UI types
    const sanitizedFiles = files.map((file) => {
      const fileUsages = file.storageKey ? (bulkUsages[file.storageKey] || []) : [];
      return {
        ...file,
        storageKey: file.storageKey || undefined,
        usageCount: fileUsages.length,
        usages: fileUsages,
      };
    });

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "FOLDER_LISTED",
      details: `Listed folder contents: ${path || "/"}`,
      metadata: { path: normalizedPath || "/", fileCount: sanitizedFiles.length },
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

    // Check if the file is used in other modules before deleting
    const usages = await getFileUsages(key);
    if (usages.length > 0) {
      const formattedUsages = usages.map(u => `${u.module}: ${u.name}`).join(", ");
      return {
        success: false,
        error: `This file cannot be deleted because it is in use by: ${formattedUsages}`,
      };
    }

    // Get file info for logging
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { id: true, name: true, path: true, metadata: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Delete from local storage (only if not external)
    const isExternal = file.metadata && typeof file.metadata === "object" && (file.metadata as Record<string, any>).isExternal;
    if (!isExternal) {
      await storage.deleteFile(key);
    }

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
      select: { name: true, path: true, size: true, mimeType: true, isFolder: true, metadata: true },
    });

    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Check if external file
    const isExternal = sourceFile.metadata && typeof sourceFile.metadata === "object" && (sourceFile.metadata as Record<string, any>).isExternal;

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
      // For files, just copy the object (if not external)
      if (!isExternal) {
        await storage.copyFile(sourceKey, destKey);
      }
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
          data: {
            ownerId: user.id,
            name: newName,
            path: newPath,
            storageKey: newStorageKey,
            size: sourceFileRecord.size,
            mimeType: sourceFileRecord.mimeType,
            isFolder: sourceFileRecord.isFolder,
            metadata: sourceFileRecord.metadata || undefined,
          },
        });
      }
      
      // Create the folder record itself
      await prisma.file.create({
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
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: sourceFile.size,
          mimeType: sourceFile.mimeType,
          isFolder: false,
          metadata: sourceFile.metadata || undefined,
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
      select: { id: true, name: true, path: true, size: true, mimeType: true, isFolder: true, metadata: true },
    });

    if (!sourceFile) {
      throw new Error("Source file not found");
    }

    // Check if external file
    const isExternal = sourceFile.metadata && typeof sourceFile.metadata === "object" && (sourceFile.metadata as Record<string, any>).isExternal;

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
      // For files, just move the object (if not external)
      if (!isExternal) {
        await storage.moveFile(sourceKey, destKey);
      }
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
          data: {
            ownerId: user.id,
            name: newName,
            path: newPath,
            storageKey: newStorageKey,
            size: sourceFileRecord.size,
            mimeType: sourceFileRecord.mimeType,
            isFolder: sourceFileRecord.isFolder,
            metadata: sourceFileRecord.metadata || undefined,
          },
        });
      }
      
      // Delete old folder record and create new one
      await prisma.file.delete({
        where: { storageKey: sourceKey },
      });
      
      await prisma.file.create({
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
        data: {
          ownerId: user.id,
          name: destFilename,
          path: destPath || "/",
          storageKey: destKey,
          size: sourceFile.size,
          mimeType: sourceFile.mimeType,
          isFolder: false,
          metadata: sourceFile.metadata || undefined,
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

    // Create directory in local storage
    await storage.createDirectory(storageKey);

    // Create folder record in database
    await prisma.file.create({
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
      select: { name: true, path: true, metadata: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Check if external file
    if (file.metadata && typeof file.metadata === "object") {
      const meta = file.metadata as Record<string, any>;
      if (meta.isExternal && meta.externalUrl) {
        return {
          success: true,
          data: { url: meta.externalUrl },
        };
      }
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
      select: { name: true, path: true, metadata: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Check if external file
    if (file.metadata && typeof file.metadata === "object") {
      const meta = file.metadata as Record<string, any>;
      if (meta.isExternal && meta.externalUrl) {
        return {
          success: true,
          data: { url: meta.externalUrl },
        };
      }
    }

    // Generate API proxy URL (goes through Next.js, which fetches from local storage internally)
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

/**
 * Add an external photo or link to the file manager
 */
export async function addExternalFile(input: {
  path: string;
  name: string;
  externalUrl: string;
  mimeType?: string;
  size?: number;
}): Promise<ActionResult<{ fileId: string; key: string }>> {
  try {
    const user = await getAuthenticatedUser();
    const { path, name, externalUrl, mimeType = "image/jpeg", size = 0 } = input;

    // Generate a unique storageKey starting with user.id/ to satisfy ownership checks
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const normalizedPath = path === "/" ? "" : path.replace(/^\/+/, "").replace(/\/+$/, "");
    const storageKey = `${user.id}/${normalizedPath}${normalizedPath ? "/" : ""}external-${uniqueId}-${name}`;

    // Create record in DB with external metadata flag
    const dbFile = await prisma.file.create({
      data: {
        ownerId: user.id,
        name,
        path: normalizedPath || "/",
        storageKey,
        size,
        mimeType,
        isFolder: false,
        metadata: {
          isExternal: true,
          externalUrl,
        },
      },
    });

    // Log the action
    await createUserLog({
      userId: user.id,
      action: "EXTERNAL_FILE_ADDED",
      details: `External file added: ${name} pointing to ${externalUrl}`,
      metadata: { fileId: dbFile.id, path: normalizedPath || "/", name, externalUrl },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: { fileId: dbFile.id, key: storageKey },
    };
  } catch (error) {
    console.error("addExternalFile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add external file",
    };
  }
}


