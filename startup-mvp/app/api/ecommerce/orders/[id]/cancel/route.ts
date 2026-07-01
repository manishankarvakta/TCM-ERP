import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientFromRequest } from "@/lib/ecommerce/client-auth";
import { SaleStatus } from "@prisma/client";

// POST /api/ecommerce/orders/[id]/cancel
export async function POST(
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

    // 2. Lookup order first to check ownership and existence
    let sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { saleNumber: id }],
        clientId: client.id,
        orderType: "ECOM",
        isTrash: false
      }
    });

    if (!sale) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // 3. Perform cancellation inside transaction
    const updatedSale = await prisma.$transaction(async (tx) => {
      // Re-fetch sale and lock relations inside the transaction
      const freshSale = await tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              item: true
            }
          }
        }
      });

      if (!freshSale) {
        throw new Error("Order not found");
      }

      // Check cancellable state constraints
      // Orders can only be cancelled by customer if they are in DRAFT status
      // and PENDING or PROCESSING deliveryStatus
      const allowedStatuses = ["DRAFT"];
      const allowedDeliveryStatuses = ["PENDING", "PROCESSING"];
      
      const currentStatus = freshSale.status;
      const currentDeliveryStatus = (freshSale.deliveryStatus || "PENDING").toUpperCase();

      if (!allowedStatuses.includes(currentStatus) || !allowedDeliveryStatuses.includes(currentDeliveryStatus)) {
        throw new Error("This order is in a status that cannot be cancelled.");
      }

      // Update sale statuses
      const updated = await tx.sale.update({
        where: { id: freshSale.id },
        data: {
          status: SaleStatus.CANCELLED,
          deliveryStatus: "CANCELLED"
        }
      });

      // Release reserved stock for each track-inventory item
      for (const saleItem of freshSale.items) {
        if (saleItem.item.trackInventory) {
          let lockedStocks: any[] = [];
          if (saleItem.variantId) {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" = ${saleItem.variantId} 
                AND "warehouseId" = ${freshSale.warehouseId} 
              FOR UPDATE
            `;
          } else {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" IS NULL 
                AND "warehouseId" = ${freshSale.warehouseId} 
              FOR UPDATE
            `;
          }

          const stockRow = lockedStocks[0];
          if (stockRow) {
            const qtyToRelease = Number(saleItem.quantity);
            const currentReserved = Number(stockRow.reservedQuantity);
            const newReserved = Math.max(0, currentReserved - qtyToRelease);

            await tx.stock.update({
              where: { id: stockRow.id },
              data: {
                reservedQuantity: newReserved
              }
            });
          }
        }
      }

      return updated;
    });

    const paymentDetails = updatedSale.paymentDetails && typeof updatedSale.paymentDetails === "object"
      ? (updatedSale.paymentDetails as any)
      : {};

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      order: {
        id: updatedSale.id,
        saleNumber: updatedSale.saleNumber,
        status: updatedSale.status,
        deliveryStatus: updatedSale.deliveryStatus || "CANCELLED",
        paymentStatus: paymentDetails.paymentStatus || "UNPAID",
        grandTotal: Number(updatedSale.grandTotal)
      }
    });

  } catch (error) {
    console.error("POST /api/ecommerce/orders/[id]/cancel error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 400 });
  }
}
