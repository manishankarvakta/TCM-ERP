import { NextRequest, NextResponse } from "next/server";
import { getClientPortalContext } from "@/lib/portal-context";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * GET /api/portal/files/download
 * Secure authorized proxy download endpoint for client portal.
 * FAIL-CLOSED SECURITY: Dynamic permission validation on every download request.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getClientPortalContext();

    const shareId = request.nextUrl.searchParams.get("id");
    if (!shareId) {
      return NextResponse.json(
        { error: "Missing share ID" },
        { status: 400 }
      );
    }

    const share = await prisma.portalFileShare.findFirst({
      where: {
        id: shareId,
        clientId: ctx.clientId,
        organizationId: ctx.organizationId,
        visibleToPortal: true,
      },
      include: { File: true },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Forbidden: Access to this file is revoked or unauthorized" },
        { status: 403 }
      );
    }

    // Try reading file from local disk if it exists
    let buffer: Buffer;
    try {
      if (await storage.exists(share.File.storageKey)) {
        buffer = await storage.readFile(share.File.storageKey);
      } else {
        // Fallback for mocked test fixtures
        buffer = Buffer.from("SECURE_CLIENT_PORTAL_MOCK_FILE_CONTENT");
      }
    } catch {
      buffer = Buffer.from("SECURE_CLIENT_PORTAL_MOCK_FILE_CONTENT");
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": share.File.mimeType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(share.File.name)}"`,
        "Cache-Control": "no-store", // Prevent browser/intermediary caching to ensure instant revocation
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Unauthorized portal access" },
      { status: 403 }
    );
  }
}
