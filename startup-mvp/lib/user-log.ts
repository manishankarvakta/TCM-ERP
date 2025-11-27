import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Log action types
export enum LogAction {
  // Authentication
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  REGISTER = "REGISTER",
  LOGIN_FAILED = "LOGIN_FAILED",
  
  // User Management
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  
  // Password Management
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_VERIFIED = "PASSWORD_RESET_VERIFIED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED",
  
  // Account Management
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  EMAIL_CHANGED = "EMAIL_CHANGED",
  
  // Security
  SECURITY_ALERT = "SECURITY_ALERT",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  
  // Generic CRUD Operations (for items, products, posts, etc.)
  ITEM_CREATED = "ITEM_CREATED",
  ITEM_UPDATED = "ITEM_UPDATED",
  ITEM_DELETED = "ITEM_DELETED",
  ITEM_VIEWED = "ITEM_VIEWED",
  
  // Custom (for flexibility)
  CUSTOM = "CUSTOM",
}

// Interface for log entry
export interface CreateLogOptions {
  userId: string;
  action: LogAction | string;
  details?: string;
  metadata?: Record<string, unknown>; // Additional metadata as JSON
  ipAddress?: string;
  userAgent?: string;
  performedBy?: string; // ID of user who performed the action (for admin actions)
}

// Interface for request metadata
export interface RequestMetadata {
  ipAddress: string;
  userAgent: string;
}

/**
 * Get request metadata from Next.js headers
 * Automatically extracts IP address and User-Agent
 */
export async function getRequestMetadata(): Promise<RequestMetadata> {
  try {
    const headersList = await headers();
    
    // Get IP address from various headers (for different hosting environments)
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const cfConnectingIp = headersList.get("cf-connecting-ip"); // Cloudflare
    const ipAddress = 
      (forwardedFor?.split(",")[0]?.trim()) ||
      realIp ||
      cfConnectingIp ||
      headersList.get("remote-addr") ||
      "127.0.0.1";
    
    // Get User-Agent
    const userAgent = headersList.get("user-agent") || "Unknown";
    
    return {
      ipAddress,
      userAgent,
    };
  } catch {
    // Fallback if headers are not available
    return {
      ipAddress: "127.0.0.1",
      userAgent: "Server Action",
    };
  }
}

/**
 * Create a user log entry
 * This is the main function to use for logging user actions
 */
export async function createUserLog(options: CreateLogOptions): Promise<void> {
  try {
    const { userId, action, details, metadata, ipAddress, userAgent, performedBy } = options;
    
    // Auto-fetch request metadata if not provided
    let requestMeta: RequestMetadata;
    if (ipAddress && userAgent) {
      requestMeta = { ipAddress, userAgent };
    } else {
      requestMeta = await getRequestMetadata();
    }
    
    // Format details with metadata if provided
    let logDetails = details || `${action} action performed`;
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataStr = JSON.stringify(metadata);
      logDetails = `${logDetails} | Metadata: ${metadataStr}`;
    }
    
    // Add performedBy info if it's different from userId (admin actions)
    if (performedBy && performedBy !== userId) {
      logDetails = `${logDetails} | Performed by: ${performedBy}`;
    }
    
    await prisma.userLog.create({
      data: {
        userId,
        action: action.toString(),
        details: logDetails,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error("Failed to create user log:", error);
  }
}

/**
 * Log user login
 */
export async function logLogin(
  userId: string,
  success: boolean = true,
  details?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: success ? LogAction.LOGIN : LogAction.LOGIN_FAILED,
    details: details || (success ? "User logged in successfully" : "Login attempt failed"),
  });
}

/**
 * Log user logout
 */
export async function logLogout(userId: string): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.LOGOUT,
    details: "User logged out",
  });
}

/**
 * Log user registration
 */
export async function logRegister(userId: string, email?: string): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.REGISTER,
    details: email ? `User registered with email: ${email}` : "User account created",
  });
}

/**
 * Log user creation (by admin)
 */
export async function logUserCreated(
  userId: string,
  performedBy: string,
  userEmail?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.USER_CREATED,
    details: userEmail ? `User created with email: ${userEmail}` : "New user created",
    performedBy,
    metadata: { createdBy: performedBy },
  });
}

/**
 * Log user update
 */
export async function logUserUpdated(
  userId: string,
  performedBy?: string,
  changes?: string[]
): Promise<void> {
  const details = changes && changes.length > 0
    ? `User updated: ${changes.join(", ")}`
    : "User information updated";
  
  await createUserLog({
    userId,
    action: LogAction.USER_UPDATED,
    details,
    performedBy,
    metadata: performedBy ? { updatedBy: performedBy, changes } : { changes },
  });
}

/**
 * Log user deletion
 */
export async function logUserDeleted(
  userId: string,
  performedBy: string,
  deletedUserEmail?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.USER_DELETED,
    details: deletedUserEmail 
      ? `User deleted: ${deletedUserEmail}` 
      : "User account deleted",
    performedBy,
    metadata: { deletedBy: performedBy },
  });
}

/**
 * Log password reset request
 */
export async function logPasswordResetRequested(
  userId: string,
  email: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.PASSWORD_RESET_REQUESTED,
    details: `Password reset code sent to ${email}`,
    metadata: { email },
  });
}

/**
 * Log password reset verification
 */
export async function logPasswordResetVerified(userId: string): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.PASSWORD_RESET_VERIFIED,
    details: "Password reset code verified successfully",
  });
}

/**
 * Log password change
 */
export async function logPasswordChanged(
  userId: string,
  performedBy?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.PASSWORD_CHANGED,
    details: performedBy && performedBy !== userId
      ? "Password changed by administrator"
      : "Password changed by user",
    performedBy,
  });
}

/**
 * Log password reset failure
 */
export async function logPasswordResetFailed(
  userId: string,
  reason?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.PASSWORD_RESET_FAILED,
    details: reason || "Password reset attempt failed",
    metadata: { reason },
  });
}

/**
 * Log profile update
 */
export async function logProfileUpdated(
  userId: string,
  changes?: string[]
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.PROFILE_UPDATED,
    details: changes && changes.length > 0
      ? `Profile updated: ${changes.join(", ")}`
      : "User profile updated",
    metadata: { changes },
  });
}

/**
 * Log email change
 */
export async function logEmailChanged(
  userId: string,
  oldEmail: string,
  newEmail: string,
  performedBy?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.EMAIL_CHANGED,
    details: `Email changed from ${oldEmail} to ${newEmail}`,
    performedBy,
    metadata: { oldEmail, newEmail, changedBy: performedBy },
  });
}

/**
 * Log security alert
 */
export async function logSecurityAlert(
  userId: string,
  alertType: string,
  details: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.SECURITY_ALERT,
    details: `Security Alert [${alertType}]: ${details}`,
    metadata: { alertType, ...metadata },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string,
  activity: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createUserLog({
    userId,
    action: LogAction.SUSPICIOUS_ACTIVITY,
    details: `Suspicious activity detected: ${activity}`,
    metadata,
  });
}

/**
 * Log custom action (for flexibility)
 */
export async function logCustom(
  userId: string,
  actionName: string,
  details: string,
  metadata?: Record<string, unknown>,
  performedBy?: string
): Promise<void> {
  await createUserLog({
    userId,
    action: actionName,
    details,
    metadata,
    performedBy,
  });
}

/**
 * Generic CRUD Operation Logging Functions
 * Use these for tracking create, update, delete operations on any entity
 * (items, products, posts, orders, etc.)
 */

/**
 * Log item creation
 */
export async function logItemCreated(
  userId: string,
  itemType: string, // e.g., "Product", "Post", "Order"
  itemId: string,
  itemName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const details = itemName 
    ? `${itemType} created: ${itemName} (ID: ${itemId})`
    : `${itemType} created (ID: ${itemId})`;
  
  await createUserLog({
    userId,
    action: LogAction.ITEM_CREATED,
    details,
    metadata: {
      itemType,
      itemId,
      itemName,
      ...metadata,
    },
  });
}

/**
 * Log item update
 */
export async function logItemUpdated(
  userId: string,
  itemType: string, // e.g., "Product", "Post", "Order"
  itemId: string,
  changes?: string[],
  itemName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  let details = itemName 
    ? `${itemType} updated: ${itemName} (ID: ${itemId})`
    : `${itemType} updated (ID: ${itemId})`;
  
  if (changes && changes.length > 0) {
    details += ` | Changes: ${changes.join(", ")}`;
  }
  
  await createUserLog({
    userId,
    action: LogAction.ITEM_UPDATED,
    details,
    metadata: {
      itemType,
      itemId,
      itemName,
      changes,
      ...metadata,
    },
  });
}

/**
 * Log item deletion
 */
export async function logItemDeleted(
  userId: string,
  itemType: string, // e.g., "Product", "Post", "Order"
  itemId: string,
  itemName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const details = itemName 
    ? `${itemType} deleted: ${itemName} (ID: ${itemId})`
    : `${itemType} deleted (ID: ${itemId})`;
  
  await createUserLog({
    userId,
    action: LogAction.ITEM_DELETED,
    details,
    metadata: {
      itemType,
      itemId,
      itemName,
      ...metadata,
    },
  });
}

/**
 * Log item view/access
 */
export async function logItemViewed(
  userId: string,
  itemType: string, // e.g., "Product", "Post", "Order"
  itemId: string,
  itemName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const details = itemName 
    ? `${itemType} viewed: ${itemName} (ID: ${itemId})`
    : `${itemType} viewed (ID: ${itemId})`;
  
  await createUserLog({
    userId,
    action: LogAction.ITEM_VIEWED,
    details,
    metadata: {
      itemType,
      itemId,
      itemName,
      ...metadata,
    },
  });
}

/**
 * Get user logs with pagination
 */
export async function getUserLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    const where: {
      userId: string;
      action?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = { userId };
    
    if (options?.action) {
      where.action = options.action;
    }
    
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }
    
    const [logs, total] = await Promise.all([
      prisma.userLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.userLog.count({ where }),
    ]);
    
    return {
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error("Get user logs error:", error);
    return {
      success: false,
      error: "Failed to fetch user logs",
      logs: [],
      pagination: {
        total: 0,
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        hasMore: false,
      },
    };
  }
}

/**
 * Get recent logs for a user (convenience function)
 */
export async function getRecentUserLogs(userId: string, limit: number = 20) {
  return getUserLogs(userId, { limit });
}

