import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProgress, getAllOperationIds } from "@/lib/backup-progress";

/**
 * GET /api/backup/progress
 * Get current progress for a backup/restore operation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const operationId = searchParams.get("operationId");

    console.log(`[Progress API] 📡 GET request received`, {
      operationId,
      timestamp: new Date().toISOString(),
      user: session.user.email,
      role: session.user.role,
    });

    if (!operationId) {
      console.error(`[Progress API] ❌ Missing operationId in request`);
      return NextResponse.json(
        { success: false, error: "operationId is required" },
        { status: 400 }
      );
    }

    const progress = await getProgress(operationId);

    if (!progress) {
      // Log for debugging - helps identify if it's a timing issue
      const availableIds = await getAllOperationIds();
      console.error(`[Progress API] ❌ Operation ${operationId} not found`, {
        requestedId: operationId,
        availableIds,
        storeSize: availableIds.length,
        timestamp: new Date().toISOString(),
        user: session.user.email,
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Operation not found",
          debug: {
            operationId,
            availableOperations: availableIds,
            timestamp: new Date().toISOString(),
          }
        },
        { status: 404 }
      );
    }

    console.log(`[Progress API] ✅ Returning progress for ${operationId}`, {
      operationId,
      stage: progress.stage,
      progress: progress.progress,
      status: progress.status,
    });

    return NextResponse.json(
      {
        success: true,
        data: progress,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching backup progress:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch progress",
      },
      { status: 500 }
    );
  }
}

