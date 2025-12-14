# Email Library Usage Guide

The email library is now fully flexible and can be used to send any type of email from anywhere in your application.

## Quick Start

```typescript
import { sendEmail } from "@/lib/email";

// Send any email
const result = await sendEmail({
  to: "user@example.com",
  subject: "Your Subject",
  html: "<h1>Hello!</h1><p>This is your email content.</p>",
  text: "Hello! This is your email content.", // Optional
});
```

## Pre-built Email Templates

### 1. Registration Success Email
```typescript
import { sendEmail, createRegistrationSuccessEmail } from "@/lib/email";

const email = createRegistrationSuccessEmail(
  "John Doe",                          // User name
  "john@example.com",                  // User email
  "https://yourapp.com/login"          // Optional login URL
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

### 2. Email Verification
```typescript
import { sendEmail, createEmailVerificationEmail, generateVerificationCode } from "@/lib/email";

const code = generateVerificationCode(6); // 6-digit code
const email = createEmailVerificationEmail(
  "John Doe",
  code,
  "https://yourapp.com/verify?code=" + code
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

### 3. Password Reset
```typescript
import { sendEmail, createPasswordResetEmail } from "@/lib/email";

const email = createPasswordResetEmail(
  "123456",        // Reset code
  "John Doe",      // User name (optional)
  15               // Expiration in minutes (optional, default 15)
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

### 4. Account Update Notification
```typescript
import { sendEmail, createAccountUpdateEmail } from "@/lib/email";

const email = createAccountUpdateEmail(
  "John Doe",
  "profile updated",
  "Your email address was changed to newemail@example.com"
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

### 5. Password Changed Notification
```typescript
import { sendEmail, createPasswordChangedEmail } from "@/lib/email";

const email = createPasswordChangedEmail(
  "John Doe",
  new Date()  // Timestamp of password change
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

### 6. Custom Notification
```typescript
import { sendEmail, createNotificationEmail } from "@/lib/email";

const email = createNotificationEmail(
  "John Doe",
  "New Feature Available",
  "We've added new features to your dashboard!",
  {
    text: "Check it out",
    link: "https://yourapp.com/dashboard"
  }
);

await sendEmail({
  to: "john@example.com",
  ...email
});
```

## Advanced Usage

### Send to Multiple Recipients
```typescript
await sendEmail({
  to: ["user1@example.com", "user2@example.com"],
  subject: "Bulk Email",
  html: "<p>Hello everyone!</p>"
});
```

### With CC and BCC
```typescript
await sendEmail({
  to: "user@example.com",
  cc: "manager@example.com",
  bcc: "archive@example.com",
  subject: "Important Update",
  html: "<p>Content here</p>"
});
```

### With Reply-To
```typescript
await sendEmail({
  to: "user@example.com",
  subject: "Support Request",
  html: "<p>How can we help?</p>",
  replyTo: "support@yourapp.com"
});
```

### With Attachments
```typescript
await sendEmail({
  to: "user@example.com",
  subject: "Report Attached",
  html: "<p>Please find the report attached.</p>",
  attachments: [
    {
      filename: "report.pdf",
      path: "/path/to/report.pdf"
    },
    {
      filename: "data.csv",
      content: Buffer.from("csv,data\n1,2\n3,4")
    }
  ]
});
```

## Complete Custom HTML Email
```typescript
const customHtml = `
  <!DOCTYPE html>
  <html>
    <body>
      <h1>Custom Email</h1>
      <p>Your dynamic content here...</p>
    </body>
  </html>
`;

await sendEmail({
  to: "user@example.com",
  subject: "Custom Subject",
  html: customHtml,
  text: "Plain text version"
});
```

## Error Handling
```typescript
const result = await sendEmail({
  to: "user@example.com",
  subject: "Test",
  html: "<p>Test</p>"
});

if (result.success) {
  console.log("Email sent:", result.messageId);
} else {
  console.error("Failed:", result.error);
  
  // Handle specific errors
  if (result.error.includes("535") || result.error.includes("authentication")) {
    console.error("SMTP authentication failed. Check your credentials.");
  }
}
```

## Using in Server Actions
```typescript
// app/actions/user.action.tsx
"use server";
import { sendEmail, createAccountUpdateEmail } from "@/lib/email";

export async function updateUserEmail(userId: string, newEmail: string) {
  // ... update user ...
  
  // Send notification
  const email = createAccountUpdateEmail(
    user.name,
    "email updated",
    `Your email was changed to ${newEmail}`
  );
  
  await sendEmail({
    to: user.oldEmail,
    ...email
  });
  
  return { success: true };
}
```

## Using in API Routes
```typescript
// app/api/notify/route.ts
import { sendEmail, createNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { userEmail, userName, message } = await request.json();
  
  const email = createNotificationEmail(
    userName,
    "New Notification",
    message
  );
  
  const result = await sendEmail({
    to: userEmail,
    ...email
  });
  
  return Response.json(result);
}
```

## Utility Functions

### Generate Verification Codes
```typescript
import { generateVerificationCode } from "@/lib/email";

const code = generateVerificationCode(6);  // 6-digit code
const longCode = generateVerificationCode(8);  // 8-digit code
```

### Generate Random Tokens
```typescript
import { generateToken } from "@/lib/email";

const token = generateToken(32);  // 32-character token
```

## Email Configuration

Make sure your `.env` file has:
```env
SMTP_HOST=mail.techsoulbd.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@techsoulbd.com
SMTP_PASS=your-password-here
EMAIL_FROM=no-reply@techsoulbd.com
EMAIL_FROM_NAME=Startup MVP
```

## Troubleshooting

### Authentication Error (535)
- Check `SMTP_USER` and `SMTP_PASS` are correct
- Verify password has no extra spaces
- Ensure credentials match the SMTP server

### Email Not Sending
- Check all environment variables are set
- Verify SMTP server is accessible
- Check server logs for detailed errors
- Test credentials in a mail client first

