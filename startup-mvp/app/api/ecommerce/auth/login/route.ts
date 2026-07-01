import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyClientPassword,
  signClientToken,
  sanitizeClient
} from "@/lib/ecommerce/client-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    // 1. Validation
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    // 2. Lookup clients with this phone number and isLoginEnabled = true
    const clients = await prisma.client.findMany({
      where: {
        phone: trimmedPhone,
        isLoginEnabled: true,
      },
    });

    if (clients.length === 0) {
      // Use generic error for login failure
      return NextResponse.json({ success: false, error: "Invalid phone or password" }, { status: 401 });
    }

    if (clients.length > 1) {
      return NextResponse.json({
        success: false,
        error: "Phone number conflict. Please contact support."
      }, { status: 409 });
    }

    const client = clients[0];

    // Ensure password hash exists
    if (!client.passwordHash) {
      return NextResponse.json({ success: false, error: "Invalid phone or password" }, { status: 401 });
    }

    // Compare passwords
    const isPasswordValid = await verifyClientPassword(trimmedPassword, client.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: "Invalid phone or password" }, { status: 401 });
    }

    // 3. Update lastLoginAt
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // 4. Generate Token and set cookie
    const token = signClientToken({
      id: updatedClient.id,
      phone: updatedClient.phone,
      name: updatedClient.name,
    });

    const isProduction = process.env.NODE_ENV === "production";
    const serializedCookie = `ecom_client_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${isProduction ? "; Secure" : ""}`;

    const sanitized = sanitizeClient(updatedClient);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      client: sanitized
    });

    response.headers.append("Set-Cookie", serializedCookie);
    return response;

  } catch (error) {
    console.error("E-commerce login API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
