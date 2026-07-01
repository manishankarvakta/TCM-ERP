import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { sanitizeClientAddress } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/client/addresses/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const address = await prisma.clientAddress.findFirst({
      where: {
        id,
        clientId: client.id
      }
    });

    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      address: sanitizeClientAddress(address)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/client/addresses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/ecommerce/client/addresses/[id]
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

    const address = await prisma.clientAddress.findFirst({
      where: {
        id,
        clientId: client.id
      }
    });

    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    const body = await req.json();
    const { recipientName, phone, addressLine, area, city, district, division, country, isDefault } = body;

    // 1. Validation
    const updateData: any = {};

    if (recipientName !== undefined) {
      if (typeof recipientName !== "string" || !recipientName.trim()) {
        return NextResponse.json({ success: false, message: "Recipient name cannot be empty" }, { status: 400 });
      }
      updateData.recipientName = recipientName.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return NextResponse.json({ success: false, message: "Phone number cannot be empty" }, { status: 400 });
      }
      updateData.phone = phone.trim();
    }

    if (addressLine !== undefined) {
      if (typeof addressLine !== "string" || !addressLine.trim()) {
        return NextResponse.json({ success: false, message: "Address line cannot be empty" }, { status: 400 });
      }
      updateData.addressLine = addressLine.trim();
    }

    if (area !== undefined) updateData.area = typeof area === "string" ? area.trim() : null;
    if (city !== undefined) updateData.city = typeof city === "string" ? city.trim() : null;
    if (district !== undefined) updateData.district = typeof district === "string" ? district.trim() : null;
    if (division !== undefined) updateData.division = typeof division === "string" ? division.trim() : null;
    if (country !== undefined) updateData.country = typeof country === "string" ? country.trim() : "Bangladesh";

    // 2. Default Address logic
    if (isDefault !== undefined) {
      const setAsDefault = !!isDefault;

      if (!setAsDefault && address.isDefault) {
        // Checking if there are other addresses
        const otherAddressesCount = await prisma.clientAddress.count({
          where: {
            clientId: client.id,
            id: { not: id }
          }
        });
        if (otherAddressesCount > 0) {
          return NextResponse.json({
            success: false,
            message: "Cannot unset default address. Set another address as default instead."
          }, { status: 400 });
        } else {
          // If it is the only address, force it to remain default
          updateData.isDefault = true;
        }
      } else if (setAsDefault) {
        updateData.isDefault = true;
      }
    }

    // 3. Execute update in transaction if setting default
    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (updateData.isDefault && !address.isDefault) {
        // Set all other addresses to false
        await tx.clientAddress.updateMany({
          where: {
            clientId: client.id,
            id: { not: id }
          },
          data: { isDefault: false }
        });
      }

      const updated = await tx.clientAddress.update({
        where: { id },
        data: updateData
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: "Address updated successfully",
      address: sanitizeClientAddress(updatedAddress)
    });

  } catch (error) {
    console.error("PATCH /api/ecommerce/client/addresses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/ecommerce/client/addresses/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const address = await prisma.clientAddress.findFirst({
      where: {
        id,
        clientId: client.id
      }
    });

    if (!address) {
      return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete the address
      await tx.clientAddress.delete({
        where: { id }
      });

      // 2. If it was default, promote the latest remaining address to default
      if (address.isDefault) {
        const latestAddress = await tx.clientAddress.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" }
        });

        if (latestAddress) {
          await tx.clientAddress.update({
            where: { id: latestAddress.id },
            data: { isDefault: true }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully"
    });

  } catch (error) {
    console.error("DELETE /api/ecommerce/client/addresses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
