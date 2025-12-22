import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/permissions/check
 * Returns the timestamp of the last permission update for the current user
 * Used by client-side polling to detect permission changes
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get the most recent update timestamp from UserPermission table
    const latestPermission = await prisma.userPermission.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    // Also check user's updatedAt (in case template was updated)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { updatedAt: true },
    });

    // Get the most recent timestamp
    const timestamps = [
      latestPermission?.updatedAt,
      user?.updatedAt,
    ].filter(Boolean) as Date[];

    const lastUpdated = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(d => d.getTime())))
      : new Date(0); // If no permissions exist, return epoch

    return NextResponse.json({
      lastUpdated: lastUpdated.toISOString(),
    });
  } catch (error) {
    console.error("Error checking permission updates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

