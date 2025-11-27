"use server";

import { prisma } from "@/lib/prisma";
import { sendEmail, generateVerificationCode, createPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { 
  logPasswordResetRequested, 
  logPasswordResetVerified, 
  logPasswordChanged, 
  logPasswordResetFailed 
} from "@/lib/user-log";

// Schema for email request
const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Schema for code verification
const verifyCodeSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
});

// Schema for password reset
const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export type EmailRequestData = z.infer<typeof emailSchema>;
export type VerifyCodeData = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// Send password reset code
export async function sendPasswordResetCode(formData: EmailRequestData) {
  try {
    const { email } = emailSchema.parse(formData);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        success: true,
        message: "If an account exists with this email, a reset code has been sent.",
      };
    }

    // Generate reset code
    const code = generateVerificationCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Verify PasswordReset model is available
    if (!prisma.passwordReset) {
      console.error("❌ PasswordReset model not available. Please restart your server.");
      throw new Error("Service temporarily unavailable. Please try again in a moment.");
    }

    // Delete any existing unused codes for this email
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        used: false,
      },
    });

    // Create new reset record
    await prisma.passwordReset.create({
      data: {
        email,
        code,
        expires: expiresAt,
      },
    });

    // Send email
    const emailContent = createPasswordResetEmail(code, user.name || undefined);
    const emailResult = await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    // Always log code in development mode for testing
    if (process.env.NODE_ENV === "development") {
      console.log("═══════════════════════════════════════");
      console.log("🔐 PASSWORD RESET CODE (DEV ONLY):");
      console.log(`📧 Email: ${email}`);
      console.log(`🔢 Code: ${code}`);
      console.log("═══════════════════════════════════════");
    }

    if (!emailResult.success) {
      console.error("❌ Failed to send email:", emailResult.error);
      // In production, still return success but log the error
      // Don't reveal that email failed to user for security
      console.error("Email error details:", emailResult.error);
    } else {
      console.log("✅ Password reset email sent successfully to:", email);
    }

    // Log password reset request
    await logPasswordResetRequested(user.id, email);

    return {
      success: true,
      message: "If an account exists with this email, a reset code has been sent.",
      // In development, return the code for testing
      ...(process.env.NODE_ENV === "development" && { devCode: code }),
    };
  } catch (error) {
    console.error("Send reset code error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "Failed to send reset code. Please try again.",
    };
  }
}

// Verify reset code
export async function verifyResetCode(formData: VerifyCodeData) {
  try {
    const { email, code } = verifyCodeSchema.parse(formData);

    // Find valid reset code
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email,
        code,
        used: false,
        expires: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetRecord) {
      // Find user for logging failed attempt
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      
      if (user) {
        await logPasswordResetFailed(user.id, "Invalid or expired code");
      }
      
      return {
        success: false,
        error: "Invalid or expired code. Please request a new code.",
      };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Log successful code verification
    await logPasswordResetVerified(user.id);

    return {
      success: true,
      message: "Code verified successfully",
    };
  } catch (error) {
    console.error("Verify code error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "Failed to verify code. Please try again.",
    };
  }
}

// Reset password with code
export async function resetPassword(formData: ResetPasswordData) {
  try {
    const { email, code, password } = resetPasswordSchema.parse(formData);

    // Verify code first
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email,
        code,
        used: false,
        expires: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!resetRecord) {
      return {
        success: false,
        error: "Invalid or expired code. Please request a new code.",
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    // Mark reset code as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        used: true,
      },
    });

    // Delete all other unused codes for this email
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        used: false,
      },
    });

    // Log password change
    await logPasswordChanged(user.id);

    return {
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    };
  } catch (error) {
    console.error("Reset password error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "Failed to reset password. Please try again.",
    };
  }
}

