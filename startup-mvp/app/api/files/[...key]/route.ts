import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/minio";
import { GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * GET /api/files/[...key]
 * Download proxy for MinIO files
 * Allows browser to access files from internal MinIO via server-side proxy
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    // Get session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Reconstruct the full key from path segments
    const key = params.key.join("/");

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

    if (file.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to access this file" },
        { status: 403 }
      );
    }

    // Get bucket name from environment
    const bucketName = process.env.MINIO_BUCKET_NAME || "espacio-files";

    // Fetch file from MinIO (internal connection)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: "File body not found" },
        { status: 500 }
      );
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
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

