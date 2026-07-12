import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * GET /api/files/[...key]
 * Download proxy for local storage files
 * Allows browser to access files via server-side proxy
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyArray } = await context.params;

    // Validate and reconstruct the full key from path segments
    if (!keyArray || !Array.isArray(keyArray) || keyArray.length === 0) {
      console.error("Download proxy error: missing or invalid key params", {
        url: request.url,
      });
      return NextResponse.json(
        { error: "Invalid file key" },
        { status: 400 }
      );
    }

    const key = keyArray.join("/");

    // Get session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify file ownership
    const file = await prisma.file.findUnique({
      where: { storageKey: key },
      select: { 
        ownerId: true, 
        name: true, 
        mimeType: true,
        size: true 
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const isImage = file.mimeType.startsWith("image/");
    if (file.ownerId !== session.user.id && !isImage) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to access this file" },
        { status: 403 }
      );
    }

    // Check if file exists on disk
    if (!await storage.exists(key)) {
      console.error(`File missing on disk: ${key}`);
      return NextResponse.json(
        { error: "File not found on storage" },
        { status: 404 }
      );
    }

    // Read file from local storage
    const buffer = await storage.readFile(key);

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": file.size.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

