"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export interface POSPermittedUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

/**
 * Get active users who have POS permission or Admin role
 * Used for authorization dropdown in Secure POS modal
 */
export async function getPOSPermittedUsers(): Promise<{
  success: boolean;
  users?: POSPermittedUser[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        status: "active",
        NOT: { status: "trash" },
        posPermissions: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    };
  } catch (error) {
    console.error("getPOSPermittedUsers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch authorized users",
    };
  }
}

/**
 * Verify password of selected authorized user for Secure POS permission override
 */
export async function verifyPOSPermissionPassword(
  userId: string,
  password: string
): Promise<{
  success: boolean;
  user?: { id: string; name: string };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!userId || !password) {
      return { success: false, error: "User selection and password are required" };
    }

    // Find authorized user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        status: true,
        posPermissions: true,
      },
    });

    if (!targetUser || targetUser.status !== "active") {
      return { success: false, error: "User not found or inactive" };
    }

    // Check authorization condition - strictly posPermissions: true
    if (!targetUser.posPermissions) {
      return { success: false, error: "Selected user does not have POS authorization permission" };
    }

    // Verify password with bcrypt
    if (!targetUser.password) {
      return { success: false, error: "Invalid user account credentials" };
    }

    const isValidPassword = await bcrypt.compare(password, targetUser.password);
    if (!isValidPassword) {
      return { success: false, error: "Incorrect password. Authorization denied." };
    }

    return {
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name || targetUser.email,
      },
    };
  } catch (error) {
    console.error("verifyPOSPermissionPassword error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify password",
    };
  }
}
