"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { sendEmail, createRegistrationSuccessEmail } from "@/lib/email";
import { logRegister, logLogin } from "@/lib/user-log";

// Registration schema validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Register user server action
export async function registerUser(formData: RegisterFormData) {

    console.log("formData", formData);
  try {
    // Validate input data
    const validatedData = registerSchema.parse(formData);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "User with this email already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "user",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Log user registration
    await logRegister(user.id, user.email);

    // Send welcome email
    try {
      const loginUrl = process.env.NEXTAUTH_URL 
        ? `${process.env.NEXTAUTH_URL}/login`
        : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
      
      const welcomeEmail = createRegistrationSuccessEmail(
        user.name || "User",
        user.email,
        loginUrl
      );
      
      await sendEmail({
        to: user.email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text,
      });
    } catch (emailError) {
      // Don't fail registration if email fails
      console.error("Failed to send welcome email:", emailError);
    }

    return {
      success: true,
      user,
      message: "Account created successfully",
    };
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

// Register user and redirect
export async function registerUserAndRedirect(formData: RegisterFormData) {
  const result = await registerUser(formData);

  if (result.success) {
    redirect("/login?message=Account created successfully. Please sign in.");
  }

  return result;
}

// Check if email exists
export async function checkEmailExists(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return {
      exists: !!user,
    };
  } catch (error) {
    console.error("Email check error:", error);
    return {
      exists: false,
      error: "Failed to check email",
    };
  }
}

// Get user by email (for login)
export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

// Login schema validation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Authenticate user server action
export async function authenticateUser(formData: LoginFormData) {
  try {
    // Validate input data
    const validatedData = loginSchema.parse(formData);

    // Get user from database
    const user = await getUserByEmail(validatedData.email);

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password);

    if (!isPasswordValid) {
      // Log failed login attempt
      await logLogin(user.id, false, "Invalid password provided");
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Log successful login
    await logLogin(user.id, true);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Login successful",
    };
  } catch (error) {
    console.error("Authentication error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Validation error",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
