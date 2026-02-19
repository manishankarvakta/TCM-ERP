import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Create S3 client for MinIO (lazy initialization to avoid build-time errors)
 */
function createS3Client() {
  const endpoint = process.env.MINIO_ENDPOINT || "espacio-minio";
  const port = process.env.MINIO_PORT || "9000";
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const accessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
  const secretKey = process.env.MINIO_SECRET_KEY || "minioadmin";

  const protocol = useSSL ? "https" : "http";
  const endpointUrl = `${protocol}://${endpoint}:${port}`;

  return new S3Client({
    endpoint: endpointUrl,
    region: "us-east-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });
}

/**
 * GET /api/files/[...key]
 * Download proxy for MinIO files
 * Allows browser to access files from internal MinIO via server-side proxy
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ key?: string[] }> }
) {
  try {
    const params = await props.params;

    // Validate and reconstruct the full key from path segments
    if (!params?.key || !Array.isArray(params.key) || params.key.length === 0) {
      console.error("Download proxy error: missing or invalid key params", {
        url: request.url,
        params,
      });
      return NextResponse.json(
        { error: "Invalid file key" },
        { status: 400 }
      );
    }

    const key = params.key.join("/");

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

    if (file.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to access this file" },
        { status: 403 }
      );
    }

    // Get bucket name from environment
    const bucketName = process.env.MINIO_BUCKET_NAME || "espaciofiles";
    
    console.log(`[API] Fetching file: ${key} from bucket: ${bucketName}`);

    // Create S3 client (at runtime, not build time)
    const s3 = createS3Client();

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
    console.error("Download proxy error for key:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}

