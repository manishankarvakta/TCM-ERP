"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { revalidateBothPaths } from "@/lib/route-utils-server";
import { NotificationType } from "@prisma/client";

type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

/**
 * Create a notification
 * If userId is provided (string or array), create notification(s) for specific user(s).
 * If userId is null or undefined, create broadcast notification for all users.
 */
export async function createNotification(data: {
  title: string;
  message: string;
  type?: NotificationType;
  userId?: string | string[] | null;
  createdBy?: string | null;
}): Promise<ActionResult> {
  try {
    console.log("createNotification called with:", { title: data.title, message: data.message, type: data.type, userId: data.userId, createdBy: data.createdBy });
    
    // Verify Prisma client is available
    if (!prisma || !prisma.notification) {
      console.error("createNotification: Prisma client or notification model not available");
      return {
        success: false,
        error: "Database client not initialized. Please restart the server.",
      };
    }
    
    const session = await auth();

    // Use provided createdBy from client, or fall back to session user ID, or null for system
    // If createdBy is explicitly provided (including null), use it; otherwise use session
    const createdBy = data.createdBy !== undefined 
      ? data.createdBy 
      : (session?.user?.id || null);

    console.log("createNotification: Session user:", session?.user ? { id: session.user.id, role: session.user.role } : "No session");
    console.log("createNotification: Prisma notification model available:", typeof prisma.notification !== 'undefined');

    const notificationType = data.type || NotificationType.INFO;
    
    console.log("createNotification: Notification type:", notificationType, "Created by user ID:", createdBy);

    // Normalize userId to array or null
    let targetUserIds: string[] | null = null;

    if (data.userId === null || data.userId === undefined) {
      // Broadcast to all users
      targetUserIds = null;
    } else if (Array.isArray(data.userId)) {
      // Multiple specific users
      targetUserIds = data.userId.filter((id) => id && id.trim() !== "");
    } else if (typeof data.userId === "string" && data.userId.trim() !== "") {
      // Single specific user
      targetUserIds = [data.userId];
    }

    // If specific users are selected
    if (targetUserIds && targetUserIds.length > 0) {
      // Verify all users exist
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: targetUserIds,
          },
        },
        select: { id: true },
      });

      if (users.length === 0) {
        return {
          success: false,
          error: "No valid users found",
        };
      }

      const validUserIds = users.map((u) => u.id);
      const invalidUserIds = targetUserIds.filter((id) => !validUserIds.includes(id));

      if (invalidUserIds.length > 0) {
        console.warn("createNotification: Some user IDs not found:", invalidUserIds);
      }

      console.log("createNotification: Creating notifications for", validUserIds.length, "specific user(s)");
      
      // Create notification for each user
      const notifications = await Promise.all(
        validUserIds.map((userId) =>
          prisma.notification.create({
            data: {
              title: data.title,
              message: data.message,
              type: notificationType,
              userId: userId,
              createdBy,
            },
          })
        )
      );

      console.log("createNotification: Successfully created", notifications.length, "notifications");

      // Revalidate paths for all affected users
      revalidateBothPaths("");
      revalidateBothPaths("notifications");
      nextRevalidatePath("/dashboard/notifications");
      validUserIds.forEach((userId) => {
        nextRevalidatePath(`/dashboard/users/${userId}`);
      });

      return {
        success: true,
        message: `Notification created for ${notifications.length} user(s)`,
        data: notifications,
      };
    }

    // If no specific users (broadcast to all users)
    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });

    console.log("createNotification: Found users:", allUsers.length);

    if (allUsers.length === 0) {
      console.error("createNotification: No users found");
      return {
        success: false,
        error: "No users found",
      };
    }

    // Create notification for each user
    console.log("createNotification: Creating broadcast notifications for", allUsers.length, "users");
    const notifications = await Promise.all(
      allUsers.map((user) =>
        prisma.notification.create({
          data: {
            title: data.title,
            message: data.message,
            type: notificationType,
            userId: user.id,
            createdBy,
          },
        })
      )
    );

    console.log("createNotification: Successfully created", notifications.length, "notifications");

    revalidateBothPaths("");
    revalidateBothPaths("notifications");
    nextRevalidatePath("/dashboard/notifications");
    // Revalidate for all users who received the notification
    allUsers.forEach((user) => {
      nextRevalidatePath(`/dashboard/users/${user.id}`);
    });

    return {
      success: true,
      message: `Notification created for ${notifications.length} users`,
      data: notifications,
    };
  } catch (error) {
    console.error("createNotification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create notification",
    };
  }
}

/**
 * Get notifications for a user
 * Returns notifications for that user + global notifications (where userId = null)
 */
export async function getUserNotifications(
  userId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Users can only view their own notifications
    // Admins can view any user's notifications
    const isAdmin = session.user.role?.toLowerCase() === "admin";
    if (!isAdmin && session.user.id !== userId) {
      return {
        success: false,
        error: "Forbidden: You can only view your own notifications",
      };
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Get user-specific notifications and global notifications (where userId is null)
    // Note: Based on the schema, userId is nullable, so we'll get notifications where userId = userId
    // For broadcast notifications, we need to check if they were created for this user
    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        userId: true,
        isRead: true,
        createdAt: true,
        readAt: true,
        createdBy: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return {
      success: true,
      data: notifications,
    };
  } catch (error) {
    console.error("getUserNotifications error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notifications",
    };
  }
}

/**
 * Get current user's notifications (server action)
 * This is a convenience wrapper that gets the current user from session
 * and fetches their notifications, with revalidation
 */
export async function getCurrentUserNotifications(): Promise<ActionResult> {
  try {
    console.log("getCurrentUserNotifications: Calling auth()...");
    const session = await auth();
    console.log("getCurrentUserNotifications: session parsed:", session ? { id: session.user?.id, email: session.user?.email, role: session.user?.role } : "null");

    if (!session?.user?.id) {
      console.warn("getCurrentUserNotifications: Unauthorized session");
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    console.log("getCurrentUserNotifications: Fetching notifications for user:", session.user.id);
    const result = await getUserNotifications(session.user.id);
    console.log("getCurrentUserNotifications: Fetch notifications result:", result.success ? "Success" : "Failed");

    // Revalidate notifications paths
    if (result.success) {
      console.log("getCurrentUserNotifications: Triggering revalidation paths...");
      revalidateBothPaths("");
      revalidateBothPaths("notifications");
      nextRevalidatePath("/dashboard/notifications");
      console.log("getCurrentUserNotifications: Revalidation paths triggered successfully.");
    }

    return result;
  } catch (error) {
    console.error("CRITICAL EXCEPTION inside getCurrentUserNotifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notifications",
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get notification to verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) {
      return {
        success: false,
        error: "Notification not found",
      };
    }

    // Users can only mark their own notifications as read
    // Admins can mark any notification as read
    const isAdmin = session.user.role?.toLowerCase() === "admin";
    if (!isAdmin && notification.userId !== session.user.id) {
      return {
        success: false,
        error: "Forbidden: You can only mark your own notifications as read",
      };
    }

    // If already read, return success
    if (notification.isRead) {
      return {
        success: true,
        message: "Notification already marked as read",
      };
    }

    // Mark as read
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidateBothPaths("");
    revalidateBothPaths("notifications");
    if (notification.userId) {
      nextRevalidatePath(`/dashboard/users/${notification.userId}`);
    }

    return {
      success: true,
      message: "Notification marked as read",
      data: updated,
    };
  } catch (error) {
    console.error("markAsRead error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark notification as read",
    };
  }
}

/**
 * Mark a notification as unread
 */
export async function markAsUnread(
  notificationId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get notification to verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true },
    });

    if (!notification) {
      return {
        success: false,
        error: "Notification not found",
      };
    }

    // Users can only mark their own notifications as unread
    // Admins can mark any notification as unread
    const isAdmin = session.user.role?.toLowerCase() === "admin";
    if (!isAdmin && notification.userId !== session.user.id) {
      return {
        success: false,
        error: "Forbidden: You can only mark your own notifications as unread",
      };
    }

    // If already unread, return success
    if (!notification.isRead) {
      return {
        success: true,
        message: "Notification already marked as unread",
      };
    }

    // Mark as unread
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: false,
        readAt: null,
      },
    });

    revalidateBothPaths("");
    revalidateBothPaths("notifications");
    if (notification.userId) {
      nextRevalidatePath(`/dashboard/users/${notification.userId}`);
    }

    return {
      success: true,
      message: "Notification marked as unread",
      data: updated,
    };
  } catch (error) {
    console.error("markAsUnread error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark notification as unread",
    };
  }
}

/**
 * Delete a notification
 * Only admin can perform this action.
 */
export async function deleteNotification(
  notificationId: string
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Only admins can delete notifications
    const isAdmin = session.user.role?.toLowerCase() === "admin";
    if (!isAdmin) {
      return {
        success: false,
        error: "Forbidden: Admin access required",
      };
    }

    // Get notification to verify it exists
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification) {
      return {
        success: false,
        error: "Notification not found",
      };
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    revalidateBothPaths("");
    if (notification.userId) {
      nextRevalidatePath(`/dashboard/users/${notification.userId}`);
    }

    return {
      success: true,
      message: "Notification deleted successfully",
    };
  } catch (error) {
    console.error("deleteNotification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete notification",
    };
  }
}

