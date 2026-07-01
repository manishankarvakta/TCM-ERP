import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { sanitizeClientProfile } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/client/profile
export async function GET(req: Request) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      client: sanitizeClientProfile(client)
    });
  } catch (error) {
    console.error("GET /api/ecommerce/client/profile error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/ecommerce/client/profile
export async function PATCH(req: Request) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, address, city, state, zip, country } = body;

    // Build update payload dynamically
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ success: false, message: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      const trimmedEmail = email && typeof email === "string" ? email.trim() : null;
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          return NextResponse.json({ success: false, message: "Invalid email address" }, { status: 400 });
        }
        
        // Ensure email isn't already used by another client
        const existingEmail = await prisma.client.findFirst({
          where: {
            email: trimmedEmail,
            id: { not: client.id }
          }
        });
        if (existingEmail) {
          return NextResponse.json({ success: false, message: "Email address is already in use" }, { status: 409 });
        }
      }
      updateData.email = trimmedEmail;
    }

    if (address !== undefined) updateData.address = typeof address === "string" ? address.trim() : null;
    if (city !== undefined) updateData.city = typeof city === "string" ? city.trim() : null;
    if (state !== undefined) updateData.state = typeof state === "string" ? state.trim() : null;
    if (zip !== undefined) updateData.zip = typeof zip === "string" ? zip.trim() : null;
    if (country !== undefined) updateData.country = typeof country === "string" ? country.trim() : null;

    // Update Client in database
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      client: sanitizeClientProfile(updatedClient)
    });

  } catch (error) {
    console.error("PATCH /api/ecommerce/client/profile error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
