import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { sanitizeClientAddress } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/client/addresses
export async function GET(req: Request) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.clientAddress.findMany({
      where: { clientId: client.id },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" }
      ]
    });

    return NextResponse.json({
      success: true,
      addresses: addresses.map(sanitizeClientAddress)
    });
  } catch (error) {
    console.error("GET /api/ecommerce/client/addresses error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/ecommerce/client/addresses
export async function POST(req: Request) {
  try {
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { recipientName, phone, addressLine, area, city, district, division, country, isDefault } = body;

    // 1. Validation
    if (!recipientName || typeof recipientName !== "string" || !recipientName.trim()) {
      return NextResponse.json({ success: false, message: "Recipient name is required" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 });
    }
    if (!addressLine || typeof addressLine !== "string" || !addressLine.trim()) {
      return NextResponse.json({ success: false, message: "Address line is required" }, { status: 400 });
    }

    const trimmedRecipient = recipientName.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddressLine = addressLine.trim();
    const trimmedArea = area && typeof area === "string" ? area.trim() : null;
    const trimmedCity = city && typeof city === "string" ? city.trim() : null;
    const trimmedDistrict = district && typeof district === "string" ? district.trim() : null;
    const trimmedDivision = division && typeof division === "string" ? division.trim() : null;
    const trimmedCountry = country && typeof country === "string" ? country.trim() : "Bangladesh";

    // 2. Count existing addresses to determine if this is the first address
    const existingCount = await prisma.clientAddress.count({
      where: { clientId: client.id }
    });

    const setAsDefault = existingCount === 0 ? true : !!isDefault;

    // 3. Create address inside a transaction to handle default address synchronization
    const newAddress = await prisma.$transaction(async (tx) => {
      if (setAsDefault && existingCount > 0) {
        // Set all other addresses for this customer to default = false
        await tx.clientAddress.updateMany({
          where: { clientId: client.id },
          data: { isDefault: false }
        });
      }

      const created = await tx.clientAddress.create({
        data: {
          clientId: client.id,
          recipientName: trimmedRecipient,
          phone: trimmedPhone,
          addressLine: trimmedAddressLine,
          area: trimmedArea,
          city: trimmedCity,
          district: trimmedDistrict,
          division: trimmedDivision,
          country: trimmedCountry,
          isDefault: setAsDefault
        }
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      message: "Address created successfully",
      address: sanitizeClientAddress(newAddress)
    });

  } catch (error) {
    console.error("POST /api/ecommerce/client/addresses error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
