import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";
import {
  hashClientPassword,
  signClientToken,
  sanitizeClient
} from "@/lib/ecommerce/client-auth";
import {
  findAccountsReceivableParent,
  generateClientCode,
  generateCustomerAccountCode
} from "@/app/(dashboard)/dashboard/clients/_actions/client.action";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, password, email } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ success: false, error: "Phone number is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email && typeof email === "string" ? email.trim() : null;

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 });
      }
    }

    // 2. Duplicate phone handling
    // Find clients with same phone and isLoginEnabled = true
    const existingLoginClients = await prisma.client.findMany({
      where: {
        phone: trimmedPhone,
        isLoginEnabled: true,
      },
    });

    if (existingLoginClients.length > 0) {
      if (existingLoginClients.length === 1) {
        return NextResponse.json({ success: false, error: "Phone number already registered" }, { status: 409 });
      } else {
        return NextResponse.json({ success: false, error: "Phone number conflict. Please contact support." }, { status: 409 });
      }
    }

    // Find first user in database to use as creator for foreign key constraints
    const systemUser = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" }
    });
    if (!systemUser) {
      return NextResponse.json({ success: false, error: "System initialization pending. Please contact support." }, { status: 500 });
    }
    const systemUserId = systemUser.id;

    const hashedPassword = await hashClientPassword(password);
    let finalClient: any = null;

    // Check if there's any existing client with this phone but isLoginEnabled = false
    const existingOfflineClients = await prisma.client.findMany({
      where: {
        phone: trimmedPhone,
        isLoginEnabled: false,
      },
      orderBy: {
        createdAt: "asc" // Grab the oldest one if there are duplicates
      }
    });

    if (existingOfflineClients.length > 0) {
      // Option 4: Update the first existing client
      const targetClient = existingOfflineClients[0];
      
      finalClient = await prisma.client.update({
        where: { id: targetClient.id },
        data: {
          name: trimmedName,
          email: trimmedEmail || targetClient.email,
          passwordHash: hashedPassword,
          isLoginEnabled: true,
        },
      });
    } else {
      // Option 5: Create a new Client + ChartOfAccount ledger in a transaction
      finalClient = await prisma.$transaction(async (tx) => {
        const clientCode = await generateClientCode(tx);
        const arParentId = await findAccountsReceivableParent(tx);

        if (!arParentId) {
          throw new Error("Accounts Receivable control account not found. Please contact support.");
        }

        const accountCode = await generateCustomerAccountCode(tx);
        const chartOfAccountId = `coa_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
        const customerName = trimmedName;
        const accountName = `AR - ${customerName}`;

        // Create Chart of Account ledger
        const chartOfAccount = await tx.chartOfAccount.create({
          data: {
            id: chartOfAccountId,
            code: accountCode,
            name: accountName,
            type: AccountType.ASSET,
            parentId: arParentId,
            description: `Accounts Receivable account for e-commerce customer: ${customerName}`,
            status: "active",
            createdBy: systemUserId,
            updatedAt: new Date(),
          },
        });

        const systemUser = await tx.user.findUnique({
          where: { id: systemUserId },
          select: { defaultWarehouseId: true },
        });

        // Create Client record linked to ledger
        const newClient = await tx.client.create({
          data: {
            name: trimmedName,
            clientCode,
            email: trimmedEmail,
            phone: trimmedPhone,
            status: "active",
            createdBy: systemUserId,
            chartOfAccountId: chartOfAccount.id,
            warehouseId: systemUser?.defaultWarehouseId || null,
            clientType: "regular",
            membershipNumber: clientCode,
            membershipTier: "NONE",
            membershipStatus: "INACTIVE",
            membershipPoints: 0,
            openingBalance: 0,
            passwordHash: hashedPassword,
            isLoginEnabled: true,
          },
        });

        return newClient;
      });
    }

    // 3. Generate Token and set cookie
    const token = signClientToken({
      id: finalClient.id,
      phone: finalClient.phone,
      name: finalClient.name,
    });

    const isProduction = process.env.NODE_ENV === "production";
    const serializedCookie = `ecom_client_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${isProduction ? "; Secure" : ""}`;

    const sanitized = sanitizeClient(finalClient);

    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
      token,
      client: sanitized
    });

    response.headers.append("Set-Cookie", serializedCookie);
    return response;

  } catch (error) {
    console.error("E-commerce registration API error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
