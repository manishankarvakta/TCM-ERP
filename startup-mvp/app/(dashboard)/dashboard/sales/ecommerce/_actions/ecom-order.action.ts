"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SaleStatus, OrderType, StockTransactionType } from "@prisma/client";
import { createSaleAccountingVoucher } from "@/app/(dashboard)/dashboard/sales/_actions/sale.action";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (_) {
    // Suppress invariant errors when run outside live Next.js request context
  }
}

// Helper to enforce admin authorization
async function requireAdmin() {
  if (process.env.MOCK_ADMIN_SESSION === "true" && process.env.NODE_ENV !== "production") {
    const admin = await prisma.user.findFirst({
      where: { role: { equals: "ADMIN", mode: "insensitive" } }
    });
    if (!admin) {
      throw new Error("Mock admin not found");
    }
    return admin;
  }

  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const isAdmin = session.user.role?.toLowerCase() === "admin";
  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }
  return session.user;
}

/**
 * Fetch all e-commerce orders with filters
 */
export async function getEcomOrders(params: {
  page?: number;
  limit?: number;
  status?: string;
  deliveryStatus?: string;
  paymentStatus?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}) {
  try {
    await requireAdmin();

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 20);
    const skip = (page - 1) * limit;

    const andConditions: any[] = [
      { orderType: OrderType.ECOM },
      { isTrash: false }
    ];

    if (params.status && params.status !== "ALL") {
      andConditions.push({ status: params.status.toUpperCase() });
    }

    if (params.deliveryStatus && params.deliveryStatus !== "ALL") {
      andConditions.push({ deliveryStatus: params.deliveryStatus.toUpperCase() });
    }

    if (params.paymentStatus && params.paymentStatus !== "ALL") {
      andConditions.push({
        paymentDetails: {
          path: ["paymentStatus"],
          equals: params.paymentStatus.trim().toUpperCase()
        }
      });
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      andConditions.push({
        OR: [
          { saleNumber: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
          { client: { phone: { contains: q, mode: "insensitive" } } }
        ]
      });
    }

    if (params.fromDate || params.toDate) {
      const dateFilter: any = {};
      if (params.fromDate) dateFilter.gte = new Date(params.fromDate);
      if (params.toDate) dateFilter.lte = new Date(params.toDate);
      andConditions.push({ createdAt: dateFilter });
    }

    const where = { AND: andConditions };

    const [orders, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          client: {
            select: { name: true, phone: true }
          },
          items: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.sale.count({ where })
    ]);

    return {
      success: true,
      orders: JSON.parse(JSON.stringify(orders)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("getEcomOrders error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch orders",
      orders: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }
}

/**
 * Fetch e-commerce order details by ID
 */
export async function getEcomOrderById(id: string) {
  try {
    await requireAdmin();

    const order = await prisma.sale.findFirst({
      where: {
        id,
        orderType: OrderType.ECOM,
        isTrash: false
      },
      include: {
        client: true,
        coupon: true,
        warehouse: true,
        items: {
          include: {
            item: {
              include: {
                stocks: true
              }
            },
            variant: {
              include: {
                stocks: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Order not found", order: null };
    }

    return {
      success: true,
      order: JSON.parse(JSON.stringify(order))
    };
  } catch (error) {
    console.error("getEcomOrderById error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch order details",
      order: null
    };
  }
}

/**
 * Update delivery status
 */
export async function updateEcomDeliveryStatus(
  saleId: string,
  deliveryStatus: string,
  courierName?: string,
  trackingNumber?: string
) {
  try {
    const user = await requireAdmin();

    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale || sale.orderType !== OrderType.ECOM) {
      return { success: false, error: "Order not found" };
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        deliveryStatus: deliveryStatus.toUpperCase(),
        courierName: courierName || sale.courierName,
        trackingNumber: trackingNumber || sale.trackingNumber,
        updatedBy: user.id
      }
    });

    safeRevalidate("/dashboard/sales/ecommerce");
    safeRevalidate(`/dashboard/sales/ecommerce/${saleId}`);

    return {
      success: true,
      order: JSON.parse(JSON.stringify(updated))
    };
  } catch (error) {
    console.error("updateEcomDeliveryStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update delivery status"
    };
  }
}

/**
 * Update payment details
 */
export async function updateEcomPaymentStatus(
  saleId: string,
  paymentStatus: string,
  paymentMethod?: string,
  paymentReference?: string
) {
  try {
    const user = await requireAdmin();

    const sale = await prisma.sale.findUnique({
      where: { id: saleId }
    });

    if (!sale || sale.orderType !== OrderType.ECOM) {
      return { success: false, error: "Order not found" };
    }

    const paymentDetails = sale.paymentDetails && typeof sale.paymentDetails === "object"
      ? (sale.paymentDetails as any)
      : {};

    const updatedPaymentDetails = {
      ...paymentDetails,
      paymentStatus: paymentStatus.toUpperCase(),
      paymentMethod: paymentMethod ? paymentMethod.toUpperCase() : paymentDetails.paymentMethod,
      paymentReference: paymentReference !== undefined ? paymentReference : paymentDetails.paymentReference,
      updatedByAdminAt: new Date()
    };

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        paymentDetails: updatedPaymentDetails,
        updatedBy: user.id
      }
    });

    safeRevalidate("/dashboard/sales/ecommerce");
    safeRevalidate(`/dashboard/sales/ecommerce/${saleId}`);

    return {
      success: true,
      order: JSON.parse(JSON.stringify(updated))
    };
  } catch (error) {
    console.error("updateEcomPaymentStatus error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update payment status"
    };
  }
}

/**
 * Complete e-commerce order: deduct stock, release reservation, create accounting voucher, update status
 */
export async function completeEcomOrder(saleId: string) {
  try {
    const user = await requireAdmin();

    // 1. Fetch order details first
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!sale || sale.orderType !== OrderType.ECOM) {
      return { success: false, error: "E-commerce order not found" };
    }

    if (sale.status !== SaleStatus.DRAFT) {
      return { success: false, error: `Only DRAFT orders can be completed. Current: ${sale.status}` };
    }

    // 2. Perform completion inside a Prisma transaction
    const completedSale = await prisma.$transaction(async (tx) => {
      // Re-verify stocks and subtract quantity + reservedQuantity
      for (const saleItem of sale.items) {
        if (saleItem.item.trackInventory) {
          let lockedStocks: any[] = [];
          if (saleItem.variantId) {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" = ${saleItem.variantId} 
                AND "warehouseId" = ${sale.warehouseId} 
              FOR UPDATE
            `;
          } else {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" IS NULL 
                AND "warehouseId" = ${sale.warehouseId} 
              FOR UPDATE
            `;
          }

          const stockRow = lockedStocks[0];
          const availableStock = stockRow ? (Number(stockRow.quantity) - Number(stockRow.reservedQuantity)) : 0;
          const qty = Number(saleItem.quantity);

          if (stockRow) {
            const newQty = Number(stockRow.quantity) - qty;
            const newReserved = Math.max(0, Number(stockRow.reservedQuantity) - qty);

            await tx.stock.update({
              where: { id: stockRow.id },
              data: {
                quantity: newQty,
                reservedQuantity: newReserved,
                lastUpdated: new Date()
              }
            });
          } else {
            // Re-verify that stock doesn't exist, create it with negative quantity
            await tx.stock.create({
              data: {
                itemId: saleItem.itemId,
                variantId: saleItem.variantId || null,
                warehouseId: sale.warehouseId,
                quantity: -qty,
                reservedQuantity: 0
              }
            });
          }

          // Create StockLedger entry
          await tx.stockLedger.create({
            data: {
              itemId: saleItem.variantId ? null : saleItem.itemId,
              variantId: saleItem.variantId || null,
              warehouseId: sale.warehouseId,
              transactionType: StockTransactionType.OUT,
              quantity: -qty,
              referenceType: "SALE",
              referenceId: sale.id,
              notes: `E-commerce Sale Completion`,
              createdBy: user.id
            }
          });
        }
      }

      // Create Accounting Voucher
      const voucherResult = await createSaleAccountingVoucher(sale.id, tx);
      if (!voucherResult.success) {
        throw new Error(voucherResult.error || "Failed to create accounting voucher");
      }

      // Update Order Status to COMPLETED
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.COMPLETED,
          completedAt: new Date(),
          updatedBy: user.id
        }
      });

      return updated;
    });

    safeRevalidate("/dashboard/sales/ecommerce");
    safeRevalidate(`/dashboard/sales/ecommerce/${saleId}`);

    return {
      success: true,
      message: "Order completed successfully",
      order: JSON.parse(JSON.stringify(completedSale))
    };

  } catch (error) {
    console.error("completeEcomOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete e-commerce order"
    };
  }
}

/**
 * Cancel e-commerce order by admin
 */
export async function cancelEcomOrder(saleId: string) {
  try {
    const user = await requireAdmin();

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!sale || sale.orderType !== OrderType.ECOM) {
      return { success: false, error: "E-commerce order not found" };
    }

    if (sale.status === SaleStatus.COMPLETED) {
      return { success: false, error: "Completed ECOM sales require return/refund flow. Cannot cancel." };
    }

    if (sale.status === SaleStatus.CANCELLED) {
      return { success: true, message: "Order is already cancelled" };
    }

    const cancelledSale = await prisma.$transaction(async (tx) => {
      // Update statuses
      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.CANCELLED,
          deliveryStatus: "CANCELLED",
          updatedBy: user.id
        }
      });

      // Release reserved stock for each track-inventory item
      for (const saleItem of sale.items) {
        if (saleItem.item.trackInventory) {
          let lockedStocks: any[] = [];
          if (saleItem.variantId) {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" = ${saleItem.variantId} 
                AND "warehouseId" = ${sale.warehouseId} 
              FOR UPDATE
            `;
          } else {
            lockedStocks = await tx.$queryRaw`
              SELECT * FROM "Stock" 
              WHERE "itemId" = ${saleItem.itemId} 
                AND "variantId" IS NULL 
                AND "warehouseId" = ${sale.warehouseId} 
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

    safeRevalidate("/dashboard/sales/ecommerce");
    safeRevalidate(`/dashboard/sales/ecommerce/${saleId}`);

    return {
      success: true,
      message: "Order cancelled successfully",
      order: JSON.parse(JSON.stringify(cancelledSale))
    };

  } catch (error) {
    console.error("cancelEcomOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel order"
    };
  }
}
