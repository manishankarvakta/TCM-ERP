"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

/**
 * Post a delivery to the ledger
 * 
 * Rules:
 * - Validate deliveredQty <= remainingQty
 * - Update derived delivered totals only via ledger
 * - Append-only (no updates after posting)
 * - Optional inventory reduction
 */
export async function postDelivery(input: {
  orderId: string;
  orderItemId: string;
  quantity: number;
  date?: Date;
  description?: string;
  reduceInventory?: boolean; // Feature flag
  userId?: string; // Optional override for tests
}) {
  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
      const session = await auth();
      effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };

    const { orderId, orderItemId, quantity, date = new Date(), description, reduceInventory = false } = input;

    // 1. Fetch OrderItem and existing ledger entries to calculate remaining
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        deliveries: true,
        order: { select: { clientId: true } }
      }
    });

    if (!orderItem) return { success: false, error: "Order item not found" };
    if (orderItem.orderId !== orderId) return { success: false, error: "Item does not belong to this order" };

    const totalDelivered = orderItem.deliveries.reduce((sum, d) => sum + Number(d.quantity), 0);
    const remainingQty = Number(orderItem.quantity) - totalDelivered;

    // Validate (for positive deliveries)
    if (quantity > 0 && quantity > remainingQty) {
      return { 
        success: false, 
        error: `Validation Failed: Requested quantity (${quantity}) exceeds remaining quantity (${remainingQty.toFixed(2)}).` 
      };
    }

    // 2. Post to Ledger
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.deliveryLedger.create({
        data: {
          orderId,
          orderItemId,
          quantity: new Prisma.Decimal(quantity),
          date,
          description,
          createdBy: effectiveUserId,
          status: "posted"
        }
      });

      // 3. Optional Inventory Reduction
      if (reduceInventory && orderItem.itemId) {
        const { processInventoryMovement } = await import("./inventory-accounting");
        const { InventoryTransactionType } = await import("@prisma/client");
        
        await processInventoryMovement({
          tx,
          itemId: orderItem.itemId,
          quantity: -1 * Number(quantity), // OUT
          type: InventoryTransactionType.SALE,
          reference: entry.id,
          note: `Delivery for Order Item: ${orderItem.description}`,
          userId: effectiveUserId
        });
      }

      return entry;
    });

    // 4. Update Order Status
    const { updateOrderStatus } = await import("./orders");
    await updateOrderStatus(orderId);

    return { success: true, deliveryId: result.id };
  } catch (error) {
    console.error("postDelivery error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to post delivery" };
  }
}

/**
 * Get paginated delivery ledger entries
 */
export async function getDeliveries(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all",
  dateFrom?: string,
  dateTo?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Search filter (Order No, Client Name)
    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
        { order: { client: { name: { contains: search, mode: "insensitive" } } } },
        { order: { client: { company: { contains: search, mode: "insensitive" } } } }
      ];
    }

    // Date filter
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [total, deliveries] = await Promise.all([
      prisma.deliveryLedger.count({ where }),
      prisma.deliveryLedger.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  company: true,
                }
              }
            }
          },
          orderItem: {
             select: {
                 description: true,
                 unitPrice: true,
             }
          },
          creator: {
             select: {
                 name: true,
                 email: true
             }
          }
        }
      })
    ]);

    return {
      success: true,
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };

  } catch (error) {
    console.error("getDeliveries error:", error);
    return { success: false, error: "Failed to fetch deliveries" };
  }
}
