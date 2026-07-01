import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { sanitizeClientAddress } from "@/lib/ecommerce/dto";

// PATCH /api/ecommerce/client/addresses/[id]/default
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 1. Confirm address ownership
    const address = await prisma.clientAddress.findFirst({
      where: {
        id,
        clientId: client.id
      }
    });

    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    // 2. Perform default update in a transaction
    const updatedAddress = await prisma.$transaction(async (tx) => {
      // Set all customer addresses to isDefault = false
      await tx.clientAddress.updateMany({
        where: { clientId: client.id },
        data: { isDefault: false }
      });

      // Set selected address to isDefault = true
      const updated = await tx.clientAddress.update({
        where: { id },
        data: { isDefault: true }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Default address updated successfully",
      address: sanitizeClientAddress(updatedAddress)
    });

  } catch (error) {
    console.error("PATCH /api/ecommerce/client/addresses/[id]/default error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
