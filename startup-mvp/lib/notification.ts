import { createNotification } from "@/app/actions/notificationActions";
import { NotificationType } from "@prisma/client";

/**
 * Simple Notification Hook
 * Automatically generates notifications based on user actions and changes
 */

// Interface for notification options
export interface NotifyOptions {
  userId: string | string[] | null; // null = broadcast to all users
  title?: string; // Auto-generated if not provided
  message?: string; // Auto-generated if not provided
  type?: NotificationType;
  action?: string; // Action type (e.g., "profile_updated", "password_changed")
  changes?: string[]; // Array of changed fields (e.g., ["name", "image"])
}

/**
 * Simple Notification Hook
 * Automatically generates notifications based on user actions and changes
 * 
 * Usage:
 *   await notifyUserAction({
 *     userId: user.id,
 *     action: "profile_updated",
 *     changes: ["name", "image"]
 *   });
 */
export async function notifyUserAction(options: NotifyOptions): Promise<void> {
  try {
    const { userId, action, changes = [], title, message, type } = options;

    // Auto-generate title and message based on action if not provided
    let finalTitle = title;
    let finalMessage = message;
    let finalType = type || NotificationType.SYSTEM;

    if (!finalTitle || !finalMessage) {
      // Auto-generate based on action
      switch (action) {
        case "profile_updated":
          finalTitle = finalTitle || "Profile Updated";
          finalMessage = finalMessage || (changes.length > 0
            ? `Your profile has been updated. Changes: ${changes.join(", ")}.`
            : "Your profile information has been successfully updated.");
          finalType = type || NotificationType.SYSTEM;
          break;
        
        case "profile_photo_updated":
          finalTitle = finalTitle || "Profile Photo Updated";
          finalMessage = finalMessage || "Your profile photo has been successfully updated.";
          finalType = type || NotificationType.SYSTEM;
          break;
        
        case "password_changed":
          finalTitle = finalTitle || "Password Changed";
          finalMessage = finalMessage || "Your password has been successfully updated.";
          finalType = type || NotificationType.SYSTEM;
          break;
        
        case "password_change_requested":
          finalTitle = finalTitle || "Password Change Requested";
          finalMessage = finalMessage || "A password change email has been sent to your email address. Please check your inbox for instructions.";
          finalType = type || NotificationType.SYSTEM;
          break;
        
        case "user_updated":
          finalTitle = finalTitle || "Account Updated";
          finalMessage = finalMessage || (changes.length > 0
            ? `Your account has been updated by an administrator. Changes: ${changes.join(", ")}.`
            : "Your account has been updated by an administrator.");
          finalType = type || NotificationType.SYSTEM;
          break;
        
        case "user_created":
          finalTitle = finalTitle || "Account Created";
          finalMessage = finalMessage || "Your account has been created.";
          finalType = type || NotificationType.SUCCESS;
          break;
        
        case "user_deleted":
          finalTitle = finalTitle || "Account Deleted";
          finalMessage = finalMessage || "Your account has been deleted. All associated data has been removed.";
          finalType = type || NotificationType.ERROR;
          break;
        
        case "file_uploaded":
          finalTitle = finalTitle || "File Uploaded";
          finalMessage = finalMessage || "File has been successfully uploaded.";
          finalType = type || NotificationType.SUCCESS;
          break;
        
        case "file_deleted":
          finalTitle = finalTitle || "File Deleted";
          finalMessage = finalMessage || "File has been deleted.";
          finalType = type || NotificationType.WARNING;
          break;
        
        default:
          finalTitle = finalTitle || "Notification";
          finalMessage = finalMessage || (changes.length > 0
            ? `Action completed. Changes: ${changes.join(", ")}.`
            : "Action completed successfully.");
          finalType = type || NotificationType.INFO;
      }
    }

    const result = await createNotification({
      title: finalTitle,
      message: finalMessage,
      type: finalType,
      userId,
      createdBy: null, // System-generated notification
    });

    if (!result.success) {
      console.error("Failed to create notification:", result.error);
    }
  } catch (error) {
    // Don't throw - notification creation should never break the main flow
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create a system notification (legacy support)
 * This is the main function to use for creating system notifications
 */
export async function createSystemNotification(
  options: { userId: string | string[] | null; title: string; message: string; type?: NotificationType; action?: string }
): Promise<void> {
  await notifyUserAction({
    userId: options.userId,
    title: options.title,
    message: options.message,
    type: options.type,
    action: options.action,
  });
}

/**
 * Notify user about profile photo update
 */
export async function notifyProfilePhotoUpdated(userId: string): Promise<void> {
  await notifyUserAction({
    userId,
    action: "profile_photo_updated",
  });
}

/**
 * Notify user about profile update
 */
export async function notifyProfileUpdated(
  userId: string,
  changes?: string[]
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "profile_updated",
    changes: changes || [],
  });
}

/**
 * Notify user about password change request
 */
export async function notifyPasswordChangeRequested(userId: string): Promise<void> {
  await notifyUserAction({
    userId,
    action: "password_change_requested",
  });
}

/**
 * Notify user about password change
 */
export async function notifyPasswordChanged(
  userId: string,
  performedBy?: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "password_changed",
    message: performedBy && performedBy !== userId
      ? "Your password has been changed by an administrator."
      : undefined,
  });
}

/**
 * Notify user about account creation (by admin)
 */
export async function notifyUserCreated(
  userId: string,
  userEmail?: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "user_created",
    message: userEmail ? `Your account has been created. Email: ${userEmail}` : undefined,
  });
}

/**
 * Notify user about account update (by admin)
 */
export async function notifyUserUpdated(
  userId: string,
  changes?: string[]
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "user_updated",
    changes: changes || [],
  });
}

/**
 * Notify user about account deletion
 */
export async function notifyUserDeleted(userId: string): Promise<void> {
  await notifyUserAction({
    userId,
    action: "user_deleted",
  });
}

/**
 * Notify user about file upload
 */
export async function notifyFileUploaded(
  userId: string,
  fileName: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "file_uploaded",
    message: `File "${fileName}" has been successfully uploaded.`,
  });
}

/**
 * Notify user about file deletion
 */
export async function notifyFileDeleted(
  userId: string,
  fileName: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "file_deleted",
    message: `File "${fileName}" has been deleted.`,
  });
}

/**
 * Notify user about security alert
 */
export async function notifySecurityAlert(
  userId: string,
  alertMessage: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "security_alert",
    title: "Security Alert",
    message: alertMessage,
    type: NotificationType.ERROR,
  });
}

/**
 * Notify user about suspicious activity
 */
export async function notifySuspiciousActivity(
  userId: string,
  activity: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "suspicious_activity",
    title: "Suspicious Activity Detected",
    message: `Suspicious activity detected: ${activity}. Please review your account security.`,
    type: NotificationType.WARNING,
  });
}

/**
 * Notify user about item creation (generic - for any module)
 */
export async function notifyItemCreated(
  userId: string,
  itemType: string,
  itemName?: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "item_created",
    title: `${itemType} Created`,
    message: itemName
      ? `${itemType} "${itemName}" has been successfully created.`
      : `${itemType} has been successfully created.`,
    type: NotificationType.SUCCESS,
  });
}

/**
 * Notify user about item update (generic - for any module)
 */
export async function notifyItemUpdated(
  userId: string,
  itemType: string,
  itemName?: string,
  changes?: string[]
): Promise<void> {
  let message = itemName
    ? `${itemType} "${itemName}" has been updated.`
    : `${itemType} has been updated.`;

  if (changes && changes.length > 0) {
    message += ` Changes: ${changes.join(", ")}.`;
  }

  await notifyUserAction({
    userId,
    action: "item_updated",
    title: `${itemType} Updated`,
    message,
    type: NotificationType.INFO,
    changes,
  });
}

/**
 * Notify user about item deletion (generic - for any module)
 */
export async function notifyItemDeleted(
  userId: string,
  itemType: string,
  itemName?: string
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "item_deleted",
    title: `${itemType} Deleted`,
    message: itemName
      ? `${itemType} "${itemName}" has been deleted.`
      : `${itemType} has been deleted.`,
    type: NotificationType.WARNING,
  });
}

/**
 * Create a custom system notification
 */
export async function notifyCustom(
  userId: string | string[] | null,
  title: string,
  message: string,
  type: NotificationType = NotificationType.INFO
): Promise<void> {
  await notifyUserAction({
    userId,
    action: "custom",
    title,
    message,
    type,
  });
}

