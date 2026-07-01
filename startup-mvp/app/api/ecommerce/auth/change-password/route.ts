import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getClientFromRequest,
  verifyClientPassword,
  hashClientPassword
} from "@/lib/ecommerce/client-auth";

export async function POST(req: Request) {
  try {
    // 1. Authenticate client
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // 2. Validate input
    if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
      return NextResponse.json({ success: false, error: "Current password is required" }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    // 3. Verify current password
    if (!client.passwordHash) {
      return NextResponse.json({ success: false, error: "Password check failed. Please contact support." }, { status: 400 });
    }

    const isCurrentValid = await verifyClientPassword(currentPassword.trim(), client.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ success: false, error: "Incorrect current password" }, { status: 400 });
    }

    // 4. Hash and update new password
    const hashedNewPassword = await hashClientPassword(newPassword.trim());

    await prisma.client.update({
      where: { id: client.id },
      data: {
        passwordHash: hashedNewPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("E-commerce change-password API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
