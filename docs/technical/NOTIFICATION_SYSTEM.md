# Notification System Documentation

## Overview

The notification system allows administrators to create and manage notifications for users. Notifications can be sent to individual users or broadcast to all users in the system.

## System Architecture

### Database Schema

```prisma
model Notification {
  id        String                @id @default(cuid())
  title     String
  message   String
  type      NotificationType      // SYSTEM, ADMIN, INFO, WARNING, ERROR, SUCCESS
  userId    String?               // null = broadcast to all users
  user      User?                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  isRead    Boolean               @default(false)
  createdAt DateTime              @default(now())
  readAt    DateTime?
  createdBy NotificationCreatedBy @default(SYSTEM) // SYSTEM or USER
}

enum NotificationType {
  SYSTEM
  ADMIN
  INFO
  WARNING
  ERROR
  SUCCESS
}

enum NotificationCreatedBy {
  SYSTEM
  USER
}
```

## Notification Types

### Available Types

1. **SYSTEM** - System-generated notifications (gray)
2. **ADMIN** - Admin-related notifications (blue)
3. **INFO** - Informational notifications (blue)
4. **WARNING** - Warning notifications (yellow)
5. **ERROR** - Error notifications (red)
6. **SUCCESS** - Success notifications (green)

## Server Actions

### 1. `createNotification(data)`

**Location**: `app/actions/notificationActions.ts`

**Parameters**:
- `title: string` - Notification title (required)
- `message: string` - Notification message (required)
- `type?: NotificationType` - Notification type (optional, defaults to INFO)
- `userId?: string` - Target user ID (optional, if not provided, broadcasts to all users)

**Behavior**:
- If `userId` is provided: Creates a single notification for that specific user
- If `userId` is not provided: Creates a notification for ALL users in the system (broadcast)
- Automatically sets `createdBy` based on the creator's role:
  - Admin users → `USER`
  - Non-admin users → `SYSTEM`

**Returns**:
```typescript
{
  success: boolean;
  message?: string;
  data?: Notification | Notification[];
  error?: string;
}
```

**Example Usage**:
```typescript
// Single user notification
await createNotification({
  title: "Welcome!",
  message: "Your account has been activated.",
  type: NotificationType.SUCCESS,
  userId: "user123"
});

// Broadcast to all users
await createNotification({
  title: "System Maintenance",
  message: "Scheduled maintenance on Dec 1st, 2024 from 2-4 AM.",
  type: NotificationType.WARNING
});
```

### 2. `getUserNotifications(userId)`

**Location**: `app/actions/notificationActions.ts`

**Parameters**:
- `userId: string` - User ID to fetch notifications for

**Behavior**:
- Returns all notifications for the specified user
- Users can only view their own notifications
- Admins can view any user's notifications
- Returns notifications ordered by `createdAt` (newest first)

**Returns**:
```typescript
{
  success: boolean;
  data?: Notification[];
  error?: string;
}
```

### 3. `markAsRead(notificationId)`

**Location**: `app/actions/notificationActions.ts`

**Parameters**:
- `notificationId: string` - Notification ID to mark as read

**Behavior**:
- Marks a notification as read
- Sets `isRead = true` and `readAt = current timestamp`
- Users can only mark their own notifications as read
- Admins can mark any notification as read
- If already read, returns success without error

**Returns**:
```typescript
{
  success: boolean;
  message?: string;
  data?: Notification;
  error?: string;
}
```

### 4. `deleteNotification(notificationId)`

**Location**: `app/actions/notificationActions.ts`

**Parameters**:
- `notificationId: string` - Notification ID to delete

**Behavior**:
- **Admin only** - Only administrators can delete notifications
- Permanently deletes the notification from the database
- Revalidates relevant paths for UI updates

**Returns**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

## API Routes

### 1. `/api/notifications/current`

**Method**: `GET`

**Description**: Fetches current user's notifications

**Authentication**: Required (uses session)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "notification_id",
      "title": "Notification Title",
      "message": "Notification message",
      "type": "INFO",
      "isRead": false,
      "createdAt": "2024-11-08T10:00:00Z",
      "readAt": null
    }
  ]
}
```

### 2. `/api/admin/notifications`

**Method**: `GET`

**Description**: Fetches all notifications (admin only)

**Authentication**: Required (admin role)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "notification_id",
      "title": "Notification Title",
      "message": "Notification message",
      "type": "INFO",
      "userId": "user_id_or_null",
      "createdAt": "2024-11-08T10:00:00Z"
    }
  ]
}
```

## UI Components

### 1. `NotificationDropdown`

**Location**: `components/NotificationDropdown.tsx`

**Features**:
- Bell icon in the dashboard header
- Shows unread count indicator (red dot)
- Displays latest 5 notifications
- Clicking a notification marks it as read
- "View All" button links to `/dashboard/notifications`
- Auto-loads when dropdown opens

**Usage**: Automatically included in `DashboardHeader`

### 2. Notifications Page

**Location**: `app/(dashboard)/dashboard/notifications/page.tsx`

**Features**:
- Full list of user's notifications
- Filter tabs: All / Unread / Read
- Table view with columns:
  - Status (read/unread indicator)
  - Title
  - Message
  - Type (with color-coded badges)
  - Date (relative time + absolute date)
  - Actions (mark as read button)
- Clicking a notification marks it as read
- Empty states for each filter

### 3. Admin Notifications Page

**Location**: `app/(dashboard)/dashboard/admin/notifications/page.tsx`

**Features**:
- **Create Notification Form**:
  - Title input
  - Message textarea
  - Type select dropdown
  - Target radio buttons (All Users / Specific User)
  - User dropdown (when "Specific User" selected)
- **Notifications List**:
  - Table of all notifications
  - Columns: Title, Type, Target, Date, Actions
  - Delete button for each notification
  - Confirmation dialog before deletion
- **Admin-only access** with permission check

## Navigation

### Sidebar Navigation

**Location**: `components/dashboard/sidebar.tsx`

- Added "Notifications" link with bell icon
- Links to `/dashboard/notifications`
- Positioned after "Files" and before "Analytics"

## Current System Notifications

### Currently Implemented

**Note**: The system currently does NOT automatically create notifications for user actions. Notifications are only created manually by administrators through the admin panel.

### Potential System Notification Triggers (Not Yet Implemented)

The following could be implemented to automatically create notifications:

1. **User Registration**
   - Type: `SUCCESS`
   - Title: "Welcome to the Platform!"
   - Message: "Your account has been successfully created."

2. **Password Reset Request**
   - Type: `INFO`
   - Title: "Password Reset Requested"
   - Message: "A password reset link has been sent to your email."

3. **Password Changed**
   - Type: `SUCCESS`
   - Title: "Password Updated"
   - Message: "Your password has been successfully changed."

4. **Account Locked**
   - Type: `WARNING`
   - Title: "Account Temporarily Locked"
   - Message: "Your account has been locked due to multiple failed login attempts."

5. **Account Unlocked**
   - Type: `INFO`
   - Title: "Account Unlocked"
   - Message: "Your account has been unlocked. You can now log in."

6. **Email Verification**
   - Type: `SUCCESS`
   - Title: "Email Verified"
   - Message: "Your email address has been successfully verified."

7. **Admin Action on User**
   - Type: `ADMIN`
   - Title: "Account Updated by Administrator"
   - Message: "An administrator has made changes to your account."

8. **File Upload Limit Reached**
   - Type: `WARNING`
   - Title: "Storage Limit Warning"
   - Message: "You are approaching your storage limit."

9. **System Maintenance**
   - Type: `SYSTEM`
   - Title: "Scheduled Maintenance"
   - Message: "System maintenance scheduled for [date/time]."

10. **Security Alert**
    - Type: `ERROR`
    - Title: "Security Alert"
    - Message: "Suspicious activity detected on your account."

## How Notifications Work

### Flow Diagram

```
1. Admin creates notification
   ↓
2. createNotification() called
   ↓
3. Check if userId provided
   ├─ Yes → Create single notification for that user
   └─ No → Create notification for ALL users (broadcast)
   ↓
4. Notification saved to database
   ↓
5. revalidatePath() called to update UI
   ↓
6. User sees notification in:
   ├─ Header dropdown (latest 5)
   └─ Notifications page (all)
   ↓
7. User clicks notification
   ↓
8. markAsRead() called
   ↓
9. isRead = true, readAt = now()
   ↓
10. UI updates automatically
```

### Permission Model

- **Regular Users**:
  - Can view their own notifications
  - Can mark their own notifications as read
  - Cannot create notifications
  - Cannot delete notifications

- **Administrators**:
  - Can view all notifications
  - Can create notifications (single or broadcast)
  - Can mark any notification as read
  - Can delete any notification
  - Can access admin notifications page

### Data Flow

1. **Creation**: Admin → `createNotification()` → Database
2. **Retrieval**: User → `getUserNotifications()` → API → Database → UI
3. **Update**: User → `markAsRead()` → Database → UI refresh
4. **Deletion**: Admin → `deleteNotification()` → Database → UI refresh

## Testing Checklist

### ✅ Implemented Features

- [x] Create notification (single user)
- [x] Create notification (broadcast to all)
- [x] Get user notifications
- [x] Mark notification as read
- [x] Delete notification (admin only)
- [x] Notification dropdown in header
- [x] Notifications page with filters
- [x] Admin notifications page
- [x] Permission checks
- [x] Loading states
- [x] Empty states
- [x] Toast notifications
- [x] Sidebar navigation link

### ⚠️ Potential Issues to Check

1. **Broadcast Notifications**: When creating a broadcast notification, it creates individual notifications for each user. This is correct behavior, but ensure it handles large user bases efficiently.

2. **Global Notifications**: The schema allows `userId = null` for global notifications, but the current implementation creates individual notifications for each user instead. This is intentional for better tracking.

3. **Real-time Updates**: Notifications don't update in real-time. Users need to refresh or reopen the dropdown to see new notifications.

4. **Notification Limits**: There's no pagination or limit on the notifications page. Consider adding pagination for users with many notifications.

## Recommendations

### Future Enhancements

1. **Automatic Notifications**: Integrate with user actions (login, registration, password changes, etc.)
2. **Real-time Updates**: Use WebSockets or Server-Sent Events for live notification updates
3. **Notification Preferences**: Allow users to configure which types of notifications they want to receive
4. **Email Notifications**: Send email for important notifications
5. **Push Notifications**: Browser push notifications for critical alerts
6. **Notification Groups**: Group related notifications
7. **Scheduled Notifications**: Create notifications to be sent at a future date/time
8. **Notification Templates**: Pre-defined templates for common notifications
9. **Bulk Actions**: Mark multiple notifications as read at once
10. **Notification History**: Archive old notifications

## Usage Examples

### Creating a Welcome Notification for New User

```typescript
import { createNotification } from "@/app/actions/notificationActions";
import { NotificationType } from "@prisma/client";

// In user registration action
await createNotification({
  title: "Welcome!",
  message: "Thank you for joining our platform. We're excited to have you!",
  type: NotificationType.SUCCESS,
  userId: newUser.id
});
```

### Broadcasting System Maintenance Notice

```typescript
await createNotification({
  title: "Scheduled Maintenance",
  message: "Our system will be under maintenance on December 1st, 2024 from 2:00 AM to 4:00 AM EST. Services may be temporarily unavailable.",
  type: NotificationType.WARNING
  // No userId = broadcast to all users
});
```

### Creating Admin Alert

```typescript
await createNotification({
  title: "New Feature Available",
  message: "We've just released a new feature! Check out the updated dashboard.",
  type: NotificationType.ADMIN
  // Broadcast to all users
});
```

