# System Notification Utility - Usage Guide

## Overview

The centralized system notification utility (`lib/notification.ts`) provides a simple, consistent way to create system notifications across your application. Similar to the user log system, it offers pre-built functions for common actions and can be easily extended for custom notifications.

## Features

- ✅ **Centralized Notifications**: Single source of truth for all system notifications
- ✅ **Pre-built Functions**: Ready-to-use functions for common actions
- ✅ **Flexible**: Support for custom notifications with different types
- ✅ **Error-Safe**: Notification creation never breaks your main application flow
- ✅ **System-Generated**: All notifications are marked as system-generated (`createdBy: null`)

## Quick Start

### Basic Usage

```typescript
import { notifyProfileUpdated, notifyFileUploaded } from "@/lib/notification";

// Simple notification
await notifyProfileUpdated(userId);

// Notification with details
await notifyProfileUpdated(userId, ["name", "image"]);

// File upload notification
await notifyFileUploaded(userId, "document.pdf");
```

## Pre-built Notification Functions

### User Profile Actions

```typescript
import {
  notifyProfilePhotoUpdated,
  notifyProfileUpdated,
  notifyPasswordChangeRequested,
  notifyPasswordChanged,
} from "@/lib/notification";

// Profile photo updated
await notifyProfilePhotoUpdated(userId);

// Profile updated with changes
await notifyProfileUpdated(userId, ["name", "email"]);

// Password change requested
await notifyPasswordChangeRequested(userId);

// Password changed
await notifyPasswordChanged(userId);
```

### User Management Actions (Admin)

```typescript
import {
  notifyUserCreated,
  notifyUserUpdated,
  notifyUserDeleted,
} from "@/lib/notification";

// User created
await notifyUserCreated(userId, "user@example.com");

// User updated by admin
await notifyUserUpdated(userId, ["name", "role"]);

// User deleted
await notifyUserDeleted(userId);
```

### File Management Actions

```typescript
import {
  notifyFileUploaded,
  notifyFileDeleted,
} from "@/lib/notification";

// File uploaded
await notifyFileUploaded(userId, "document.pdf");

// File deleted
await notifyFileDeleted(userId, "document.pdf");
```

### Security Actions

```typescript
import {
  notifySecurityAlert,
  notifySuspiciousActivity,
} from "@/lib/notification";

// Security alert
await notifySecurityAlert(userId, "Unusual login detected from new location");

// Suspicious activity
await notifySuspiciousActivity(userId, "Multiple failed login attempts");
```

### Generic Item Actions (for any module)

```typescript
import {
  notifyItemCreated,
  notifyItemUpdated,
  notifyItemDeleted,
} from "@/lib/notification";

// Item created (e.g., Product, Post, Order, etc.)
await notifyItemCreated(userId, "Product", "iPhone 15");

// Item updated
await notifyItemUpdated(userId, "Product", "iPhone 15", ["price", "stock"]);

// Item deleted
await notifyItemDeleted(userId, "Product", "iPhone 15");
```

### Custom Notifications

```typescript
import { notifyCustom } from "@/lib/notification";
import { NotificationType } from "@prisma/client";

// Custom notification for single user
await notifyCustom(
  userId,
  "Custom Title",
  "Custom message here",
  NotificationType.INFO
);

// Custom notification for multiple users
await notifyCustom(
  [userId1, userId2, userId3],
  "Bulk Notification",
  "This is a bulk notification",
  NotificationType.INFO
);

// Broadcast to all users
await notifyCustom(
  null, // null = broadcast to all users
  "System Maintenance",
  "Scheduled maintenance will occur tonight at 2 AM",
  NotificationType.WARNING
);
```

## Notification Types

Available notification types from `@prisma/client`:

- `NotificationType.SYSTEM` - System-generated notifications (default)
- `NotificationType.ADMIN` - Admin-related notifications
- `NotificationType.INFO` - Informational notifications
- `NotificationType.WARNING` - Warning notifications
- `NotificationType.ERROR` - Error notifications
- `NotificationType.SUCCESS` - Success notifications

## Usage Examples

### Example 1: Profile Update

```typescript
// In your server action
import { notifyProfileUpdated } from "@/lib/notification";

export async function updateProfile(data: ProfileData) {
  // ... update logic ...
  
  const changes = ["name", "image"];
  await notifyProfileUpdated(userId, changes);
  
  return { success: true };
}
```

### Example 2: File Upload

```typescript
// In your file upload action
import { notifyFileUploaded } from "@/lib/notification";

export async function uploadFile(file: File, userId: string) {
  // ... upload logic ...
  
  await notifyFileUploaded(userId, file.name);
  
  return { success: true };
}
```

### Example 3: Admin User Update

```typescript
// In your admin user update action
import { notifyUserUpdated } from "@/lib/notification";

export async function updateUserByAdmin(userId: string, data: UserData) {
  // ... update logic ...
  
  const changes = ["name", "role", "email"];
  await notifyUserUpdated(userId, changes);
  
  return { success: true };
}
```

### Example 4: Custom Module Action

```typescript
// In your custom module action (e.g., blog post, product, order)
import { notifyItemCreated } from "@/lib/notification";

export async function createBlogPost(userId: string, post: PostData) {
  // ... create logic ...
  
  await notifyItemCreated(userId, "Blog Post", post.title);
  
  return { success: true };
}
```

## Integration with User Logs

The notification system works alongside the user log system. You can use both:

```typescript
import { logUserUpdated } from "@/lib/user-log";
import { notifyUserUpdated } from "@/lib/notification";

export async function updateUser(userId: string, data: UserData) {
  // ... update logic ...
  
  const changes = ["name", "email"];
  
  // Log the action (for audit trail)
  await logUserUpdated(userId, session.user.id, changes);
  
  // Notify the user (for real-time feedback)
  await notifyUserUpdated(userId, changes);
  
  return { success: true };
}
```

## Best Practices

1. **Always use the utility functions**: Don't call `createNotification` directly unless you need custom behavior
2. **Handle errors gracefully**: Notification creation is wrapped in try-catch, but you can add additional error handling if needed
3. **Use appropriate notification types**: Choose the right type (SUCCESS, WARNING, ERROR, etc.) for better UX
4. **Include relevant details**: Pass changes or details arrays when available for better context
5. **Don't break the main flow**: Notification creation should never fail your main operation

## Adding New Notification Functions

To add a new notification function, add it to `lib/notification.ts`:

```typescript
/**
 * Notify user about custom action
 */
export async function notifyCustomAction(
  userId: string,
  itemName: string
): Promise<void> {
  await createSystemNotification({
    userId,
    title: "Custom Action",
    message: `Custom action performed on ${itemName}.`,
    type: NotificationType.INFO,
    action: NotificationAction.CUSTOM,
  });
}
```

## Database Schema

Notifications are stored in the `Notification` table:

```prisma
model Notification {
  id        String                @id @default(cuid())
  title     String
  message   String
  type      NotificationType
  userId    String?               // null = broadcast to all users
  user      User?                 @relation(fields: [userId], references: [id])
  isRead    Boolean               @default(false)
  createdAt DateTime              @default(now())
  readAt    DateTime?
  createdBy String?               // null = system-generated
  creator   User?                 @relation("NotificationCreator", fields: [createdBy], references: [id])
}
```

## Troubleshooting

### Notifications Not Appearing

- Check that the `userId` is valid and exists
- Verify that the Prisma client is properly initialized
- Check server console for error messages (notification errors don't break the main flow)
- Ensure the notification is being created (check database directly)

### Notifications Not Showing in UI

- Verify the notification API endpoint is working
- Check that the user is fetching notifications correctly
- Ensure revalidation is happening after notification creation
- Check browser console for errors

### Performance Concerns

- Notification creation is asynchronous and non-blocking
- For high-volume notifications, consider batching
- Use broadcast notifications (`userId: null`) sparingly

## Migration from Direct createNotification Calls

**Before:**
```typescript
await createNotification({
  title: "Profile Updated",
  message: "Your profile has been updated.",
  type: NotificationType.SYSTEM,
  userId: user.id,
  createdBy: null,
});
```

**After:**
```typescript
import { notifyProfileUpdated } from "@/lib/notification";

await notifyProfileUpdated(user.id);
```

The new system provides cleaner, more maintainable code with consistent notification formatting.

