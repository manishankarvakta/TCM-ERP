import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { createUserLog } from "@/lib/user-log";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function buildStorageKey(userId: string, path: string, filename: string): string {
  const normalizedPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  const normalizedFilename = filename.replace(/^\/+/, "");
  
  if (normalizedPath) {
    return `${userId}/${normalizedPath}/${normalizedFilename}`;
  }
  return `${userId}/${normalizedFilename}`;
}

export async function POST(req: Request) {
  try {
    console.log("API POST /api/files/upload: Resolving authenticated user...");
    const session = await auth();
    console.log("API POST /api/files/upload: session parsed:", session ? { id: session.user?.id, email: session.user?.email, role: session.user?.role } : "null");

    if (!session?.user?.id) {
      console.warn("API POST /api/files/upload: Unauthorized user access attempt");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse formData from request
    console.log("API POST /api/files/upload: Parsing FormData...");
    const formData = await req.formData();
    console.log("API POST /api/files/upload: Received FormData keys:", Array.from(formData.keys()));

    const file = formData.get("file") as File;
    const path = (formData.get("path") as string) || "";

    if (!file) {
      console.warn("API POST /api/files/upload: No file part in FormData");
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const name = file.name;
    const contentType = file.type || "application/octet-stream";
    const size = file.size;

    console.log("API POST /api/files/upload: Upload details:", { name, path, contentType, size });

    // Build storage key
    const storageKey = buildStorageKey(userId, path, name);
    console.log("API POST /api/files/upload: Storage key resolved as:", storageKey);

    // Convert file to arrayBuffer and buffer
    console.log("API POST /api/files/upload: Converting file to arrayBuffer...");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("API POST /api/files/upload: Buffer created. Length:", buffer.length);

    // Upload to local storage internally
    console.log("API POST /api/files/upload: Saving file to disk...");
    await storage.saveFile(storageKey, buffer);
    console.log("API POST /api/files/upload: File successfully saved to disk.");

    // Check if file already exists
    console.log("API POST /api/files/upload: Querying database for existing storage key...");
    const existingFile = await prisma.file.findUnique({
      where: { storageKey },
    });
    console.log("API POST /api/files/upload: Existing file query result:", existingFile ? "Found" : "Not Found");

    let dbFile;
    if (existingFile) {
      // Update existing file
      console.log("API POST /api/files/upload: Updating existing file record in DB...");
      dbFile = await prisma.file.update({
        where: { storageKey },
        data: {
          size,
          mimeType: contentType,
          updatedAt: new Date(),
        },
      });

      console.log("API POST /api/files/upload: Creating user log for FILE_UPDATED...");
      await createUserLog({
        userId,
        action: "FILE_UPDATED",
        details: `File updated: ${name} at path: ${path || "/"}`,
        metadata: { fileId: dbFile.id, path, name, size, mimeType: contentType },
      });
    } else {
      // Create new file record
      console.log("API POST /api/files/upload: Creating new file record in DB...");
      dbFile = await prisma.file.create({
        data: {
          ownerId: userId,
          name,
          path: path || "/",
          storageKey,
          size,
          mimeType: contentType,
          isFolder: false,
        },
      });

      console.log("API POST /api/files/upload: Creating user log for FILE_UPLOADED...");
      await createUserLog({
        userId,
        action: "FILE_UPLOADED",
        details: `File uploaded: ${name} at path: ${path || "/"}`,
        metadata: { fileId: dbFile.id, path, name, size, mimeType: contentType },
      });
    }

    // Revalidate the whole layout to ensure UI consistency
    console.log("API POST /api/files/upload: Triggering layout revalidation...");
    revalidatePath("/", "layout");
    console.log("API POST /api/files/upload: Layout revalidated successfully.");

    return NextResponse.json({
      success: true,
      data: { fileId: dbFile.id, key: storageKey },
    });
  } catch (error) {
    console.error("API POST /api/files/upload: CRITICAL EXCEPTION:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    }, { status: 500 });
  }
}
