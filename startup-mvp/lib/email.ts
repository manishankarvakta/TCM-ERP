import nodemailer from "nodemailer";

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail?: string;
  fromName?: string;
}

// Get email configuration from environment
const getEmailConfig = (): EmailConfig | null => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    const port = parseInt(process.env.SMTP_PORT || "465");
    return {
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465 || process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      fromEmail: process.env.EMAIL_FROM || process.env.SMTP_USER,
      fromName: process.env.EMAIL_FROM_NAME || "Startup MVP",
    };
  }
  return null;
};

// Create transporter
let transporter: nodemailer.Transporter | null = null;

const createTransporter = (): nodemailer.Transporter | null => {
  if (transporter) {
    return transporter;
  }

  const config = getEmailConfig();

  if (!config) {
    console.warn("⚠️  Email credentials not configured. Emails will not be sent.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
      requireTLS: config.port === 587,
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
      debug: process.env.NODE_ENV === "development",
      logger: process.env.NODE_ENV === "development",
    });

    return transporter;
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error);
    return null;
  }
};

// Enhanced email options interface
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    href?: string;
  }>;
}

// Main email sending function - Universal and flexible
export async function sendEmail(options: SendEmailOptions) {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      const errorMsg = "Email transporter not configured";
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const config = getEmailConfig();
    if (!config) {
      return {
        success: false,
        error: "Email configuration not found",
      };
    }

    const fromEmail = config.fromEmail || config.user;
    const fromName = config.fromName || "Startup MVP";

    // Verify connection before sending (optional, can skip for faster sends)
    if (process.env.NODE_ENV === "development") {
      try {
        await transporter.verify();
        console.log("✅ SMTP connection verified");
      } catch (verifyError) {
        console.warn("⚠️  SMTP verification warning:", verifyError instanceof Error ? verifyError.message : "Unknown error");
        // Continue anyway - some servers don't support verify
      }
    }

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(", ") : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(", ") : options.bcc) : undefined,
      replyTo: options.replyTo,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log(`📧 To: ${mailOptions.to}`);
    console.log(`📬 Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";
    
    // Provide more specific error messages
    if (errorMessage.includes("535") || errorMessage.includes("Incorrect authentication")) {
      return {
        success: false,
        error: "Email authentication failed. Please check your SMTP credentials (SMTP_USER and SMTP_PASS) in .env file.",
      };
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// EMAIL TEMPLATE GENERATORS
// ============================================

// Base email template wrapper
function createEmailTemplate({
  title,
  greeting,
  content,
  footer,
  buttonText,
  buttonLink,
}: {
  title: string;
  greeting: string;
  content: string;
  footer?: string;
  buttonText?: string;
  buttonLink?: string;
}) {
  const buttonHtml = buttonText && buttonLink
    ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${buttonLink}" style="display: inline-block; padding: 12px 24px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${buttonText}</a>
      </div>
    `
    : "";

  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${title}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="margin-top: 0; font-size: 16px;">${greeting}</p>
              
              <div style="margin: 20px 0;">
                ${content}
              </div>
              
              ${buttonHtml}
              
              ${footer ? `<p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">${footer}</p>` : ""}
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Startup MVP. All rights reserved.</p>
              <p style="margin: 5px 0 0 0;">This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${title}

${greeting}

${content.replace(/<[^>]*>/g, "").replace(/\n\s*\n/g, "\n\n")}

${buttonText && buttonLink ? `${buttonText}: ${buttonLink}` : ""}

${footer ? `\n${footer}` : ""}

---
© ${new Date().getFullYear()} Startup MVP. All rights reserved.
This is an automated email, please do not reply.
    `.trim(),
  };
}

// ============================================
// SPECIFIC EMAIL TEMPLATES
// ============================================

// Password Reset Email
export function createPasswordResetEmail(code: string, name?: string, expirationMinutes: number = 15) {
  const userName = name || "User";
  const email = createEmailTemplate({
    title: "Password Reset Request",
    greeting: `Hello ${userName},`,
    content: `
      <p>You requested to reset your password. Use the following verification code to proceed:</p>
      <div style="background: #f9f9f9; border: 2px dashed #1d4ed8; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
        <h1 style="color: #1d4ed8; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
      </div>
      <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in ${expirationMinutes} minutes.</p>
    `,
    footer: "If you didn't request this password reset, please ignore this email and your password will remain unchanged.",
  });

  return {
    subject: "Password Reset Code - Startup MVP",
    ...email,
  };
}

// Registration Success Email
export function createRegistrationSuccessEmail(name: string, email: string, loginUrl?: string) {
  const emailContent = createEmailTemplate({
    title: "Welcome to Startup MVP!",
    greeting: `Hello ${name},`,
    content: `
      <p>Thank you for registering with Startup MVP! Your account has been successfully created.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>You can now access all the features of our platform.</p>
    `,
    buttonText: loginUrl ? "Login to Your Account" : undefined,
    buttonLink: loginUrl || undefined,
    footer: "If you have any questions, feel free to contact our support team.",
  });

  return {
    subject: "Welcome to Startup MVP - Account Created",
    ...emailContent,
  };
}

// Email Verification Email
export function createEmailVerificationEmail(name: string, verificationCode: string, verificationUrl?: string, expirationMinutes: number = 60) {
  const emailContent = createEmailTemplate({
    title: "Verify Your Email Address",
    greeting: `Hello ${name},`,
    content: `
      <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
      <div style="background: #f9f9f9; border: 2px dashed #1d4ed8; border-radius: 8px; padding: 30px; text-align: center; margin: 20px 0;">
        <h1 style="color: #1d4ed8; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${verificationCode}</h1>
      </div>
      <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in ${expirationMinutes} minutes.</p>
      ${verificationUrl ? `<p>Or click the button below to verify:</p>` : ""}
    `,
    buttonText: verificationUrl ? "Verify Email Address" : undefined,
    buttonLink: verificationUrl || undefined,
    footer: "If you didn't create an account, please ignore this email.",
  });

  return {
    subject: "Verify Your Email Address - Startup MVP",
    ...emailContent,
  };
}

// Account Update Notification
export function createAccountUpdateEmail(name: string, updateType: string, details?: string) {
  const emailContent = createEmailTemplate({
    title: "Account Updated",
    greeting: `Hello ${name},`,
    content: `
      <p>Your account has been ${updateType}.</p>
      ${details ? `<p><strong>Details:</strong></p><p>${details}</p>` : ""}
      <p>If you didn't make this change, please contact our support team immediately.</p>
    `,
    footer: "For security reasons, please keep your account information secure.",
  });

  return {
    subject: `Account ${updateType} - Startup MVP`,
    ...emailContent,
  };
}

// Password Changed Notification
export function createPasswordChangedEmail(name: string, timestamp: Date) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(timestamp);

  const emailContent = createEmailTemplate({
    title: "Password Changed",
    greeting: `Hello ${name},`,
    content: `
      <p>Your password was successfully changed on <strong>${formattedDate}</strong>.</p>
      <p>If you didn't make this change, please contact our support team immediately and change your password.</p>
    `,
    footer: "For your security, we recommend using a strong, unique password.",
  });

  return {
    subject: "Password Changed - Startup MVP",
    ...emailContent,
  };
}

// Generic Notification Email
export function createNotificationEmail(
  name: string,
  title: string,
  message: string,
  actionButton?: { text: string; link: string }
) {
  const emailContent = createEmailTemplate({
    title: title,
    greeting: `Hello ${name},`,
    content: `<p>${message}</p>`,
    buttonText: actionButton?.text,
    buttonLink: actionButton?.link,
  });

  return {
    subject: `${title} - Startup MVP`,
    ...emailContent,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate verification code
export function generateVerificationCode(length: number = 6): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)).toString();
}

// Generate random token
export function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
