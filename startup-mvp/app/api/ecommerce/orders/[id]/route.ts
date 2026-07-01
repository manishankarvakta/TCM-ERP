import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { serializeEcomOrderDetail } from "@/lib/ecommerce/dto";

// GET /api/ecommerce/orders/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate client
    const client = await getClientFromRequest(req);
    if (!client) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const includeRelations = {
      coupon: true,
      items: {
        include: {
          item: true,
          variant: true
        }
      }
    };

    // 2. Try looking up by CUID id
    let sale = await prisma.sale.findFirst({
      where: {
        id,
        clientId: client.id,
        orderType: "ECOM",
        isTrash: false
      },
      include: includeRelations
    });

    // 3. Try looking up by saleNumber
    if (!sale) {
      sale = await prisma.sale.findFirst({
        where: {
          saleNumber: id,
          clientId: client.id,
          orderType: "ECOM",
          isTrash: false
        },
        include: includeRelations
      });
    }

    if (!sale) {
      return NextResponse.json({
        success: false,
        message: "Order not found"
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: serializeEcomOrderDetail(sale)
    });

  } catch (error) {
    console.error("GET /api/ecommerce/orders/[id] error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error"
    }, { status: 500 });
  }
}
