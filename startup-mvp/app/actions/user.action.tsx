"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logUserDeleted, logUserCreated, logUserUpdated, getUserLogs } from "@/lib/user-log";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import bcrypt from "bcryptjs";
import { NotificationType, type Prisma } from "@prisma/client";
import {
  notifyUserAction,
  notifyPasswordChangeRequested,
  notifyPasswordChanged,
  notifyUserUpdated,
  createSystemNotification,
} from "@/lib/notification";

export async function getCurrentUser() {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  // Get full user data from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      defaultWarehouseId: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name || "User",
    email: user.email || "",
    image: user.image || null,
    role: user.role,
    defaultWarehouseId: user.defaultWarehouseId,
  };
}

/**
 * Update current user's profile
 */
export async function updateCurrentUserProfile(input: {
  name?: string;
  firstName?: string;
  lastName?: string;
  image?: string;
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        user: null,
      };
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, image: true },
    });

    if (!currentUser) {
      return {
        success: false,
        error: "User not found",
        user: null,
      };
    }

    // Prepare update data
    const updateData: {
      name?: string;
      image?: string | null;
    } = {};

    // Track what changed for notifications
    const changes: string[] = [];
    const previousImage = currentUser.image;
    const previousName = currentUser.name;


    console.log("Profile update - Previous values:", { name: previousName, image: previousImage });
    console.log("Profile update - Input values:", { name: input.name, firstName: input.firstName, lastName: input.lastName, image: input.image });

    // Handle name update (either direct name or firstName + lastName)
    if (input.name !== undefined) {
      updateData.name = input.name;
      // Compare normalized values (handle null/undefined/empty string)
      const normalizedPrevious = previousName || "";
      const normalizedNew = input.name || "";
      if (normalizedPrevious !== normalizedNew) {
        changes.push("name");
        console.log("Name change detected:", { previous: previousName, new: input.name });
      }
    } else if (input.firstName !== undefined || input.lastName !== undefined) {
      const firstName = input.firstName || "";
      const lastName = input.lastName || "";
      const newName = `${firstName} ${lastName}`.trim() || undefined;
      updateData.name = newName;
      // Compare normalized values
      const normalizedPrevious = previousName || "";
      const normalizedNew = newName || "";
      if (normalizedPrevious !== normalizedNew) {
        changes.push("name");
        console.log("Name change detected:", { previous: previousName, new: newName });
      }
    }

    // Handle image update
    if (input.image !== undefined) {
      updateData.image = input.image || null;
      // Compare normalized values (handle null/undefined/empty string)
      const normalizedPrevious = previousImage || "";
      const normalizedNew = input.image || "";
      if (normalizedPrevious !== normalizedNew) {
        changes.push("image");
        console.log("Image change detected:", { previous: previousImage, new: input.image });
      }
    }

    console.log("Detected changes:", changes);

    // Update user
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

   

    // Log user update
    await logUserUpdated(user.id, session.user.id, Object.keys(updateData));

    // Create system notifications for profile changes using simple hook
    if (changes.length > 0) {
      // Use the simple notification hook - it automatically generates notifications
      await notifyUserAction({
        userId: user.id,
        action: "profile_updated",
        changes: changes,
      });
    }

    // Revalidate profile page and dashboard layout to refresh session
    revalidateBothPaths("profile");
    revalidateBothPaths("");
    revalidateBothPaths("settings");

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("updateCurrentUserProfile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
      user: null,
    };
  }
}

/**
 * Request password change email
 */
export async function requestPasswordChange() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // TODO: Implement password change email functionality
    // For now, just return success
    // In a real app, you would:
    // 1. Generate a secure token
    // 2. Store it in the database with expiration
    // 3. Send an email with a link to reset password
    // 4. The link would contain the token

    // Create system notification for password change request
    try {
      await notifyPasswordChangeRequested(session.user.id);
    } catch (error) {
      // Don't fail password change request if notification creation fails
      console.error("Failed to create notification:", error);
    }

    return {
      success: true,
      message: "Password change email sent",
    };
  } catch (error) {
    console.error("requestPasswordChange error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send password change email",
    };
  }
}

/**
 * Delete current user's account
 */
export async function deleteCurrentUserAccount() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get user info before deletion
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Delete user (cascades will delete sessions, accounts, userLogs, files)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Log the deletion
    await logUserDeleted(session.user.id, session.user.id, user.email || undefined);

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteCurrentUserAccount error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account",
    };
  }
}

/**
 * Get paginated list of users with search
 */
export async function getUsers(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: "active" | "inactive" | "trash" | "all" = "all"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      console.error("getUsers: No session found");
      return {
        success: false,
        error: "Unauthorized",
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Only admins can view users list
    // Check role case-insensitively
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      console.error(`getUsers: User role is "${session.user.role}", admin required`);
      return {
        success: false,
        error: `Forbidden: Admin access required. Your role: ${session.user.role || "none"}`,
        users: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    // Build where clause for search and status using Prisma types
    const where: Prisma.UserWhereInput = {};
    
    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status (default: exclude trash, show active and inactive)
    if (status === "trash") {
      where.status = "trash";
    } else if (status === "active") {
      where.status = "active";
    } else if (status === "inactive") {
      where.status = "inactive";
    } else if (status === "all") {
      // Show all except trash by default
      where.status = { not: "trash" };
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with sessions
    const users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        status: true,
        isActive: true,
        inchargeId: true,
          incharge: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          defaultWarehouse: {
            select: {
              name: true,
            },
          },
          createdAt: true,
          sessions: {
            select: {
              id: true,
              expires: true,
            },
          where: {
            expires: {
              gt: new Date(), // Only active sessions
            },
          },
          },
          _count: {
            select: {
              userLogs: true,
              sessions: true,
            },
          },
        },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error("getUsers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
      users: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Delete a user (moves to trash)
 */
export async function deleteUser(userId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can delete users
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Cannot delete yourself
    if (session.user.id === userId) {
      return {
        success: false,
        error: "Cannot delete your own account",
      };
    }

    // Get user info before moving to trash for logging
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!userToDelete) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Move user to trash (soft delete)
    await prisma.user.update({
      where: { id: userId },
      data: { status: "trash" },
    });

    // Log the deletion
    await logUserDeleted(userId, session.user.id, userToDelete.email || undefined);

    // Revalidate users page for both admin and dashboard
    nextRevalidatePath("/dashboard/users");

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete user",
    };
  }
}

/**
 * Force logout a user by deleting all their sessions
 */
export async function forceLogoutUser(userId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can force logout users
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Cannot force logout yourself
    if (session.user.id === userId) {
      return {
        success: false,
        error: "Cannot force logout yourself",
      };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Delete all sessions for this user
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Revalidate users page to update login status
    nextRevalidatePath("/dashboard/users");

    return {
      success: true,
    };
  } catch (error) {
    console.error("forceLogoutUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to force logout user",
    };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        user: null,
      };
    }

    // Only admins can view user details
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
        user: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        inchargeId: true,
        incharge: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        defaultWarehouseId: true,
        defaultWarehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            userLogs: true,
            sessions: true,
            accounts: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        user: null,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("getUserById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user",
      user: null,
    };
  }
}

/**
 * Get active users for dropdown selection
 */
export async function getActiveUsers() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        users: [],
      };
    }

    // Only admins can view users list
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
        users: [],
      };
    }

    // Get active users (no pagination, for dropdown use)
    const users = await prisma.user.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      users,
    };
  } catch (error) {
    console.error("getActiveUsers error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch users",
      users: [],
    };
  }
}

/**
 * Create a new user
 */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  image?: string;
  inchargeId?: string;
  defaultWarehouseId?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        user: null,
      };
    }

    // Only admins can create users
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
        user: null,
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User with this email already exists",
        user: null,
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: input.role,
        image: input.image || null,
        inchargeId: input.inchargeId || null,
        defaultWarehouseId: input.defaultWarehouseId || null,
        status: input.status || "active",
        isActive: (input as any).isActive || "enabled",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log user creation
    await logUserCreated(user.id, session.user.id, user.email);

    // Revalidate users page for both admin and dashboard
    nextRevalidatePath("/dashboard/users");

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("createUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create user",
      user: null,
    };
  }
}

/**
 * Update a user
 */
export async function updateUser(input: {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  image?: string;
  inchargeId?: string;
  defaultWarehouseId?: string;
  status?: "active" | "inactive";
}) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
        user: null,
      };
    }

    // Only admins can update users
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
        user: null,
      };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: input.id },
      select: { id: true, email: true, name: true, role: true, image: true },
    });

    if (!existingUser) {
      return {
        success: false,
        error: "User not found",
        user: null,
      };
    }
    
    // Check if email is being changed and if it's already taken
    if (input.email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (emailTaken) {
        return {
          success: false,
          error: "Email is already taken by another user",
          user: null,
        };
      }
    }

    // Prepare update data
    const updateData: {
      name: string;
      email: string;
      role: string;
      image?: string | null;
      password?: string;
      inchargeId?: string | null;
      defaultWarehouseId?: string | null;
      status?: string;
    } = {
      name: input.name,
      email: input.email,
      role: input.role,
      image: input.image || null,
    };

    // Handle defaultWarehouseId
    if (input.defaultWarehouseId !== undefined) {
      updateData.defaultWarehouseId = input.defaultWarehouseId && input.defaultWarehouseId.length > 0 ? input.defaultWarehouseId : null;
    }

    // Handle status
    if ((input as any).status !== undefined) {
      updateData.status = (input as any).status;
    }

    // Handle inchargeId (can be undefined, null, or empty string)
    if (input.inchargeId !== undefined) {
      updateData.inchargeId = input.inchargeId && input.inchargeId.length > 0 ? input.inchargeId : null;
    }

    // Only update password if provided
    if (input.password && input.password.length > 0) {
      updateData.password = await bcrypt.hash(input.password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: input.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log user update - track what actually changed
    const changes: string[] = [];
    if (input.name !== existingUser.name) changes.push("name");
    if (input.email !== existingUser.email) changes.push("email");
    if (input.role !== existingUser.role) changes.push("role");
    if (input.password && input.password.length > 0) changes.push("password");
    if (input.image !== undefined && input.image !== existingUser.image) changes.push("image");
    if (input.inchargeId !== undefined) {
      // Get current inchargeId to compare
      const currentUser = await prisma.user.findUnique({
        where: { id: input.id },
        select: { inchargeId: true },
      });
      const newInchargeId = input.inchargeId && input.inchargeId.length > 0 ? input.inchargeId : null;
      if (currentUser?.inchargeId !== newInchargeId) changes.push("incharge");
    }

    await logUserUpdated(user.id, session.user.id, changes);

     //test notification creation
     console.log("Creating system notification", changes);
      
     await createSystemNotification({
       title: "Profile Update",
       message: "Your profile has been updated.",
       type: NotificationType.SYSTEM,
       userId: session.user.id,
     });

    // Create system notification for user updates (only if user is updating their own profile or admin is updating)
    try {
      if (changes.length > 0) {
        // If admin is updating another user, notify that user
        if (session.user.id !== user.id) {
          await notifyUserUpdated(user.id, changes);
        }
      }
    } catch (error) {
      // Don't fail user update if notification creation fails
      console.error("Failed to create notification:", error);
    }

    // Revalidate users page for both admin and dashboard
    nextRevalidatePath("/dashboard/users");
    nextRevalidatePath(`/dashboard/users/${user.id}`);

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("updateUser error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user",
      user: null,
    };
  }
}

/**
 * Bulk update user status
 */
export async function bulkUpdateUserStatus(
  userIds: string[],
  status: "active" | "inactive" | "trash"
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can update users
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
    return {
      success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Cannot update yourself
    if (userIds.includes(session.user.id)) {
      return {
        success: false,
        error: "Cannot update your own account",
      };
    }

    if (userIds.length === 0) {
      return {
        success: false,
        error: "No users selected",
      };
    }

    // Update users
    await prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        status,
      },
    });

    // Revalidate users page for both admin and dashboard
    nextRevalidatePath("/dashboard/users");

    return {
      success: true,
    };
  } catch (error) {
    console.error("bulkUpdateUserStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update users",
    };
  }
}

/**
 * Delete users permanently
 */
export async function deleteUsersPermanently(userIds: string[]) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can delete users
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Cannot delete yourself
    if (userIds.includes(session.user.id)) {
      return {
        success: false,
        error: "Cannot delete your own account",
      };
    }

    if (userIds.length === 0) {
      return {
        success: false,
        error: "No users selected",
      };
    }

    // Delete users permanently
    await prisma.user.deleteMany({
      where: {
        id: { in: userIds },
        status: "trash", // Only allow deleting users that are in trash
      },
    });

    // Revalidate users page for both admin and dashboard
    nextRevalidatePath("/dashboard/users");
    
    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteUsersPermanently error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete users",
    };
  }
}

/**
 * Export getUserLogs from user-log for convenience
 */
/**
 * Toggle user active status (Enable/Disable login)
 */
export async function toggleUserActiveStatus(userId: string) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can toggle status
    const userRole = session.user.role?.toLowerCase();
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const nextStatus = user.isActive === "enabled" ? "disabled" : "enabled";

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: nextStatus },
    });

    return {
      success: true,
      isActive: nextStatus,
    };
  } catch (error) {
    console.error("toggleUserActiveStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle status",
    };
  }
}

export { getUserLogs };
