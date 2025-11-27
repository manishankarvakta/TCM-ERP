# User Log System - Usage Guide

## Overview

The centralized user logging system (`lib/user-log.ts`) provides a simple, consistent way to log all user activities across your application. It automatically captures IP addresses, user agents, and request metadata, and provides specialized functions for common actions.

## Features

- ✅ **Centralized Logging**: Single source of truth for all user logs
- ✅ **Automatic Metadata**: Automatically extracts IP address and user agent from request headers
- ✅ **Pre-built Functions**: Ready-to-use functions for common actions
- ✅ **Flexible**: Support for custom actions with metadata
- ✅ **Error-Safe**: Logging never breaks your main application flow
- ✅ **Admin Actions**: Track who performed admin actions on users

## Quick Start

### Basic Usage

```typescript
import { createUserLog, logLogin, logRegister } from "@/lib/user-log";

// Simple log entry
await createUserLog({
  userId: "user123",
  action: "CUSTOM_ACTION",
  details: "User performed a custom action",
});

// Using pre-built functions
await logLogin(userId, true); // Success
await logLogin(userId, false, "Invalid password"); // Failed
await logRegister(userId, "user@example.com");
```

## Pre-built Logging Functions

### Authentication Actions

```typescript
import { logLogin, logLogout, logRegister } from "@/lib/user-log";

// Log successful login
await logLogin(userId);

// Log failed login
await logLogin(userId, false, "Invalid credentials provided");

// Log logout
await logLogout(userId);

// Log registration
await logRegister(userId, "user@example.com");
```

### User Management Actions

```typescript
import { 
  logUserCreated, 
  logUserUpdated, 
  logUserDeleted,
  logProfileUpdated 
} from "@/lib/user-log";
import { auth } from "@/lib/auth";

// Log user creation (by admin)
const session = await auth();
const performedBy = session?.user?.id || "system";

await logUserCreated(userId, performedBy, "user@example.com");

// Log user update with changes
const changes = ["Name changed to John Doe", "Role changed to admin"];
await logUserUpdated(userId, performedBy, changes);

// Log user deletion
await logUserDeleted(userId, performedBy, "user@example.com");

// Log profile update
await logProfileUpdated(userId, ["Email updated", "Profile image changed"]);
```

### Password Management

```typescript
import { 
  logPasswordResetRequested,
  logPasswordResetVerified,
  logPasswordChanged,
  logPasswordResetFailed 
} from "@/lib/user-log";

// Log password reset request
await logPasswordResetRequested(userId, "user@example.com");

// Log successful code verification
await logPasswordResetVerified(userId);

// Log password change
await logPasswordChanged(userId, performedBy);

// Log failed reset attempt
await logPasswordResetFailed(userId, "Expired code provided");
```

### Email Changes

```typescript
import { logEmailChanged } from "@/lib/user-log";

await logEmailChanged(
  userId, 
  "old@example.com", 
  "new@example.com",
  performedBy
);
```

### Security Actions

```typescript
import { logSecurityAlert, logSuspiciousActivity } from "@/lib/user-log";

// Log security alert
await logSecurityAlert(
  userId,
  "Multiple Failed Login Attempts",
  "5 failed login attempts detected within 5 minutes",
  { attempts: 5, timeWindow: "5 minutes" }
);

// Log suspicious activity
await logSuspiciousActivity(
  userId,
  "Unusual login location detected",
  { location: "New York", previousLocation: "London" }
);
```

### Generic CRUD Operations (Items, Products, Posts, etc.)

The library includes generic functions to track any create, update, delete, or view operations on any entity:

```typescript
import { 
  logItemCreated, 
  logItemUpdated, 
  logItemDeleted,
  logItemViewed 
} from "@/lib/user-log";

// Log when creating a product
await logItemCreated(
  userId,
  "Product",
  productId,
  "iPhone 15 Pro", // Optional: item name
  { price: 999, category: "Electronics" } // Optional: metadata
);

// Log when updating a blog post with changes tracked
await logItemUpdated(
  userId,
  "Post",
  postId,
  ["Title updated", "Content modified", "Tags changed"], // Changes array
  "My Blog Post", // Optional: item name
  { wordCount: 1200 } // Optional: metadata
);

// Log when deleting an order
await logItemDeleted(
  userId,
  "Order",
  orderId,
  "Order #12345", // Optional: item name
  { totalAmount: 199.99 } // Optional: metadata
);

// Log when viewing/accessing an item
await logItemViewed(
  userId,
  "Product",
  productId,
  "Laptop", // Optional: item name
  { viewDuration: "2m 30s" } // Optional: metadata
);
```

**When to use these functions:**
- Creating/updating/deleting products, posts, orders, invoices, etc.
- Any entity CRUD operations in your application
- Track what users create, modify, or remove
- Audit trail for important data changes

## Custom Logging

For actions that don't have a pre-built function, use `createUserLog` or `logCustom`:

```typescript
import { createUserLog, logCustom, LogAction } from "@/lib/user-log";

// Method 1: Using createUserLog
await createUserLog({
  userId: "user123",
  action: "FILE_UPLOADED",
  details: "User uploaded a document",
  metadata: {
    fileName: "document.pdf",
    fileSize: "2.5MB",
    uploadId: "upload123"
  },
});

// Method 2: Using logCustom
await logCustom(
  userId,
  "FILE_DOWNLOADED",
  "User downloaded a file",
  { fileId: "file123", fileName: "report.pdf" },
  performedBy // Optional: if action was performed by admin
);
```

## Automatic Metadata Extraction

The logging system automatically extracts IP address and user agent from request headers. You can override these if needed:

```typescript
await createUserLog({
  userId: "user123",
  action: "CUSTOM_ACTION",
  details: "Action details",
  // These are optional - will be auto-detected if not provided
  ipAddress: "192.168.1.1",
  userAgent: "Custom User Agent",
});
```

## Admin Actions Tracking

For actions performed by admins on other users, include the `performedBy` parameter:

```typescript
import { auth } from "@/lib/auth";

const session = await auth();
const adminUserId = session?.user?.id;

await logUserCreated(
  newUserId,        // ID of the user being created
  adminUserId,      // ID of the admin performing the action
  "user@example.com"
);

// Or with createUserLog
await createUserLog({
  userId: targetUserId,
  action: "USER_SUSPENDED",
  details: "User account suspended",
  performedBy: adminUserId,
  metadata: { reason: "Policy violation", duration: "30 days" },
});
```

## Retrieving Logs

### Get User Logs with Pagination

```typescript
import { getUserLogs, getRecentUserLogs } from "@/lib/user-log";

// Get logs with pagination
const result = await getUserLogs(userId, {
  limit: 20,
  offset: 0,
  action: "LOGIN", // Optional: filter by action
  startDate: new Date("2024-01-01"), // Optional: filter by date range
  endDate: new Date("2024-12-31"),
});

if (result.success) {
  console.log("Logs:", result.logs);
  console.log("Total:", result.pagination.total);
  console.log("Has more:", result.pagination.hasMore);
}

// Get recent logs (convenience function)
const recentLogs = await getRecentUserLogs(userId, 10);
```

### Available Log Actions (Enum)

```typescript
import { LogAction } from "@/lib/user-log";

// Authentication
LogAction.LOGIN
LogAction.LOGOUT
LogAction.REGISTER
LogAction.LOGIN_FAILED

// User Management
LogAction.USER_CREATED
LogAction.USER_UPDATED
LogAction.USER_DELETED
LogAction.PROFILE_UPDATED

// Password Management
LogAction.PASSWORD_RESET_REQUESTED
LogAction.PASSWORD_RESET_VERIFIED
LogAction.PASSWORD_CHANGED
LogAction.PASSWORD_RESET_FAILED

// Account Management
LogAction.ACCOUNT_LOCKED
LogAction.ACCOUNT_UNLOCKED
LogAction.EMAIL_VERIFIED
LogAction.EMAIL_CHANGED

// Security
LogAction.SECURITY_ALERT
LogAction.SUSPICIOUS_ACTIVITY

// Generic CRUD Operations
LogAction.ITEM_CREATED
LogAction.ITEM_UPDATED
LogAction.ITEM_DELETED
LogAction.ITEM_VIEWED

// Custom
LogAction.CUSTOM
```

## Integration Examples

### Example 1: User Registration

```typescript
// app/actions/auth.action.tsx
import { logRegister } from "@/lib/user-log";

export async function registerUser(formData: RegisterFormData) {
  // ... create user logic ...
  
  // Log registration
  await logRegister(user.id, user.email);
  
  // ... rest of logic ...
}
```

### Example 2: Admin Updating User

```typescript
// app/actions/user.action.tsx
import { logUserUpdated, logEmailChanged, logPasswordChanged } from "@/lib/user-log";
import { auth } from "@/lib/auth";

export async function updateUser(formData: UpdateUserFormData) {
  const session = await auth();
  const performedBy = session?.user?.id;
  
  // ... update logic ...
  
  // Track changes
  const changes = [];
  if (emailChanged) changes.push(`Email changed to ${user.email}`);
  if (nameChanged) changes.push(`Name changed to ${user.name}`);
  if (roleChanged) changes.push(`Role changed to ${user.role}`);
  
  // Log updates
  await logUserUpdated(user.id, performedBy, changes);
  
  if (emailChanged) {
    await logEmailChanged(user.id, oldEmail, user.email, performedBy);
  }
  
  if (passwordChanged) {
    await logPasswordChanged(user.id, performedBy);
  }
}
```

### Example 3: Password Reset Flow

```typescript
// app/actions/password-reset.action.tsx
import { 
  logPasswordResetRequested,
  logPasswordResetVerified,
  logPasswordChanged,
  logPasswordResetFailed 
} from "@/lib/user-log";

export async function sendPasswordResetCode(formData: EmailRequestData) {
  // ... send code logic ...
  
  await logPasswordResetRequested(user.id, email);
}

export async function verifyResetCode(formData: VerifyCodeData) {
  // ... verify logic ...
  
  if (!valid) {
    await logPasswordResetFailed(user.id, "Invalid code");
    return { success: false };
  }
  
  await logPasswordResetVerified(user.id);
}

export async function resetPassword(formData: ResetPasswordData) {
  // ... reset password logic ...
  
  await logPasswordChanged(user.id);
}
```

### Example 4: Tracking Product CRUD Operations

```typescript
// app/actions/product.action.tsx
import { 
  logItemCreated, 
  logItemUpdated, 
  logItemDeleted,
  logItemViewed 
} from "@/lib/user-log";
import { auth } from "@/lib/auth";

export async function createProduct(formData: ProductFormData) {
  const session = await auth();
  const userId = session?.user?.id;
  
  // ... create product logic ...
  const product = await prisma.product.create({ ... });
  
  // Log product creation
  await logItemCreated(
    userId!,
    "Product",
    product.id,
    product.name,
    { price: product.price, category: product.category }
  );
  
  return { success: true, product };
}

export async function updateProduct(id: string, formData: ProductFormData) {
  const session = await auth();
  const userId = session?.user?.id;
  
  // Track changes
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  const changes = [];
  if (formData.name !== existingProduct?.name) changes.push("Name updated");
  if (formData.price !== existingProduct?.price) changes.push("Price updated");
  
  // ... update product logic ...
  const product = await prisma.product.update({ ... });
  
  // Log product update
  await logItemUpdated(
    userId!,
    "Product",
    product.id,
    changes,
    product.name,
    { oldPrice: existingProduct.price, newPrice: product.price }
  );
  
  return { success: true, product };
}

export async function deleteProduct(id: string) {
  const session = await auth();
  const userId = session?.user?.id;
  
  // Get product info before deletion
  const product = await prisma.product.findUnique({ where: { id } });
  
  // ... delete product logic ...
  await prisma.product.delete({ where: { id } });
  
  // Log product deletion
  await logItemDeleted(
    userId!,
    "Product",
    id,
    product?.name,
    { wasActive: product?.active }
  );
  
  return { success: true };
}

// In a product detail page component
export async function ProductDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session?.user?.id;
  
  // ... fetch product logic ...
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  
  // Log product view
  if (userId && product) {
    await logItemViewed(
      userId,
      "Product",
      product.id,
      product.name,
      { timestamp: new Date().toISOString() }
    );
  }
  
  // ... render product ...
}
```

## Best Practices

1. **Always Log Important Actions**: Log user creation, updates, deletions, authentication, and security events.

2. **Include Context**: Use the `metadata` field to store additional context that might be useful for debugging or auditing.

3. **Track Admin Actions**: Always pass `performedBy` for admin actions so you know who performed the action.

4. **Don't Break on Logging Errors**: The logging system is designed to never throw errors - it catches and logs them internally.

5. **Use Appropriate Actions**: Use the pre-built functions when possible, or use the LogAction enum for consistency.

6. **Filter Logs**: When retrieving logs, use filtering to reduce data transfer and improve performance.

7. **Track All CRUD Operations**: Use `logItemCreated`, `logItemUpdated`, `logItemDeleted` for any entity CRUD operations (products, posts, orders, etc.) to maintain a complete audit trail.

8. **Log Views for Important Items**: Use `logItemViewed` for tracking access to sensitive or important resources.

9. **Automatic IP and User Agent**: The system automatically captures IP addresses and user agents - you don't need to manually pass them unless you have specific requirements.

## Database Schema

The logs are stored in the `UserLog` table:

```prisma
model UserLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  details   String?  @db.Text
  ipAddress String?
  userAgent String?  @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}
```

## Troubleshooting

### Logs Not Appearing

- Check that the `userId` is valid and exists
- Verify that the Prisma client is properly initialized
- Check server console for error messages (logging errors don't break the main flow)

### IP Address Shows "127.0.0.1"

- This is normal in development or when headers aren't available
- In production with proper reverse proxy headers, IP addresses will be captured automatically
- Supported headers: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`

### Performance Concerns

- Logging is asynchronous and non-blocking
- If you have high-volume logging, consider implementing a queue system
- Use pagination when retrieving logs

## Migration from Old Logging

If you have existing code using `prisma.userLog.create()` directly:

**Before:**
```typescript
await prisma.userLog.create({
  data: {
    userId: user.id,
    action: "LOGIN",
    details: "User logged in",
    ipAddress: "127.0.0.1",
    userAgent: "Browser",
  },
});
```

**After:**
```typescript
import { logLogin } from "@/lib/user-log";

await logLogin(user.id);
```

The new system automatically handles IP address and user agent extraction, making your code cleaner and more maintainable.

