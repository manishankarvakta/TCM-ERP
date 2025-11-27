import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/app/actions/notificationActions";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getUserNotifications(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Add cache headers for client-side polling
    return NextResponse.json(
      {
        success: true,
        data: result.data,
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
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}

