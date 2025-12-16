import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Check if any users already exist
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Users already exist." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password, name, organizationName } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    if (!organizationName || !organizationName.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "admin",
        status: "active",
        emailVerified: new Date(),
      },
    });

    // Create default organization
    await prisma.organization.create({
      data: {
        id: "default-org",
        name: organizationName,
        details: "Default organization",
        status: "active",
        createdBy: admin.id,
      },
    });

    // Auto-login the admin user
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch (authError) {
      console.error("Auto-login failed:", authError);
      // Don't fail the setup if auto-login fails
      // User can still login manually
    }

    // Invalidate setup cache so middleware knows setup is complete
    // Dynamic import to avoid issues with middleware functions
    if (typeof window === 'undefined') {
      try {
        const { invalidateSetupCache } = await import('@/proxy');
        invalidateSetupCache();
      } catch (e) {
        // Cache will expire naturally, not critical
        console.log("Could not invalidate setup cache, will expire naturally");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
      admin: {
        email: admin.email,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 }
    );
  }
}

