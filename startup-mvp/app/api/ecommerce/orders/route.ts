import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { serializeEcomOrderListItem, serializePagination } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/orders
export async function GET(req: Request) {
  try {
    // 1. Authenticate client
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const status = searchParams.get("status");
    const deliveryStatus = searchParams.get("deliveryStatus");
    const paymentStatus = searchParams.get("paymentStatus");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // 3. Build conditions (ownership is critical)
    const andConditions: any[] = [
      { clientId: client.id },
      { orderType: "ECOM" },
      { isTrash: false }
    ];

    if (status) {
      andConditions.push({ status: status.toUpperCase() });
    }

    if (deliveryStatus) {
      andConditions.push({ deliveryStatus: deliveryStatus.toUpperCase() });
    }

    if (paymentStatus) {
      andConditions.push({
        paymentDetails: {
          path: ["paymentStatus"],
          equals: paymentStatus.trim().toUpperCase()
        }
      });
    }

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        dateFilter.gte = new Date(fromDate);
      }
      if (toDate) {
        dateFilter.lte = new Date(toDate);
      }
      andConditions.push({ createdAt: dateFilter });
    }

    const where = { AND: andConditions };

    // 4. Query Database
    const [orders, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          items: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.sale.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      orders: orders.map(serializeEcomOrderListItem),
      pagination: serializePagination(page, limit, total)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/orders error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
