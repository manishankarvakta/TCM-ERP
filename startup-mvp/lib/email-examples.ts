/**
 * Email Library Usage Examples
 * 
 * This file demonstrates how to use the email library from anywhere in your application.
 */

import {
  sendEmail,
  createPasswordResetEmail,
  createRegistrationSuccessEmail,
  createEmailVerificationEmail,
  createAccountUpdateEmail,
  createPasswordChangedEmail,
  createNotificationEmail,
  generateVerificationCode,
} from "./email";

// ============================================
// EXAMPLE 1: Registration Success Email
// ============================================
export async function sendRegistrationEmail(userEmail: string, userName: string) {
  const loginUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login`;
  const email = createRegistrationSuccessEmail(userName, userEmail, loginUrl);

  return await sendEmail({
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// EXAMPLE 2: Email Verification
// ============================================
export async function sendVerificationEmail(
  userEmail: string,
  userName: string,
  verificationCode: string
) {
  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email?code=${verificationCode}`;
  const email = createEmailVerificationEmail(userName, verificationCode, verifyUrl);

  return await sendEmail({
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// EXAMPLE 3: Account Update Notification
// ============================================
export async function sendAccountUpdateEmail(
  userEmail: string,
  userName: string,
  updateType: string,
  details?: string
) {
  const email = createAccountUpdateEmail(userName, updateType, details);

  return await sendEmail({
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// EXAMPLE 4: Password Changed Notification
// ============================================
export async function sendPasswordChangedEmail(userEmail: string, userName: string) {
  const email = createPasswordChangedEmail(userName, new Date());

  return await sendEmail({
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// EXAMPLE 5: Custom Notification Email
// ============================================
export async function sendCustomNotificationEmail(
  userEmail: string,
  userName: string,
  title: string,
  message: string,
  actionButton?: { text: string; link: string }
) {
  const email = createNotificationEmail(userName, title, message, actionButton);

  return await sendEmail({
    to: userEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}

// ============================================
// EXAMPLE 6: Custom HTML Email (Full Control)
// ============================================
export async function sendCustomEmail(
  to: string | string[],
  subject: string,
  htmlContent: string,
  options?: {
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content?: Buffer | string;
      path?: string;
    }>;
  }
) {
  return await sendEmail({
    to,
    subject,
    html: htmlContent,
    cc: options?.cc,
    bcc: options?.bcc,
    replyTo: options?.replyTo,
    attachments: options?.attachments,
  });
}

// ============================================
// EXAMPLE 7: Bulk Email (Multiple Recipients)
// ============================================
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  htmlContent: string
) {
  return await sendEmail({
    to: recipients,
    subject,
    html: htmlContent,
  });
}

// ============================================
// USAGE IN SERVER ACTIONS OR API ROUTES
// ============================================

/*
// In a server action:
import { sendRegistrationEmail } from "@/lib/email-examples";

export async function registerUser(data) {
  // ... create user ...
  
  // Send email
  await sendRegistrationEmail(user.email, user.name);
  
  return { success: true };
}

// In any component or API route:
import { sendEmail, createNotificationEmail } from "@/lib/email";

const result = await sendEmail({
  to: "user@example.com",
  subject: "Custom Subject",
  html: "<h1>Your custom HTML</h1>",
  text: "Your plain text version"
});

if (result.success) {
  console.log("Email sent!");
}
*/

