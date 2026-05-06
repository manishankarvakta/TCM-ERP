import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUserLog } from "@/lib/user-log";
import JSZip from "jszip";

export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    
    if (!user?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { keys } = body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: keys must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify ownership of all files
    const files = await prisma.file.findMany({
      where: {
        storageKey: { in: keys },
        ownerId: user.user.id,
      },
      select: {
        id: true,
        name: true,
        path: true,
        storageKey: true,
        isFolder: true,
      },
    });

    if (files.length !== keys.length) {
      return NextResponse.json(
        { error: "Some files were not found or you don't have permission to access them" },
        { status: 403 }
      );
    }

    // Filter out folders (only include files)
    const fileRecords = files.filter((f) => !f.isFolder);

    if (fileRecords.length === 0) {
      return NextResponse.json(
        { error: "No files to download" },
        { status: 400 }
      );
    }

    // Create ZIP file
    const zip = new JSZip();

    // Download each file and add to ZIP
    const { storage } = await import("@/lib/storage");

    for (const file of fileRecords) {
      try {
        const fileBuffer = await storage.readFile(file.storageKey);
        
        // Add file to ZIP with its name
        zip.file(file.name, fileBuffer);
      } catch (error) {
        console.error(`Error adding file ${file.name} to ZIP:`, error);
        // Continue with other files even if one fails
      }
    }

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Log the action
    await createUserLog({
      userId: user.user.id,
      action: "FILES_DOWNLOADED_AS_ZIP",
      details: `Downloaded ${fileRecords.length} files as ZIP`,
      metadata: {
        fileCount: fileRecords.length,
        fileNames: fileRecords.map((f) => f.name),
      },
    });

        // Return ZIP file as response
        return new NextResponse(zipBuffer as unknown as BodyInit, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="files-${Date.now()}.zip"`,
          },
        });
  } catch (error) {
    console.error("Download ZIP error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ZIP file" },
      { status: 500 }
    );
  }
}

