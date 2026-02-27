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
        DeliveryLedger: true,
        Order: { select: { clientId: true } }
      }
    });

    if (!orderItem) return { success: false, error: "Order item not found" };
    if (orderItem.orderId !== orderId) return { success: false, error: "Item does not belong to this order" };

    const totalDelivered = orderItem.DeliveryLedger.reduce((sum: number, d: any) => sum + Number(d.quantity), 0);
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
      // Dynamic import to avoid circular dependencies if any
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
        { Order: { orderNumber: { contains: search, mode: "insensitive" } } },
        { Order: { Client: { name: { contains: search, mode: "insensitive" } } } },
        { Order: { Client: { company: { contains: search, mode: "insensitive" } } } }
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
          Order: {
            select: {
              id: true,
              orderNumber: true,
              Client: {
                select: {
                  id: true,
                  name: true,
                  company: true,
                }
              }
            }
          },
          OrderItem: {
             select: {
                 description: true,
                 unitPrice: true,
             }
          },
          User: {
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

export async function getDelivery(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const delivery = await prisma.deliveryLedger.findUnique({
      where: { id },
      select: { id: true, date: true }
    });

    return { success: true, delivery };
  } catch (error) {
    return { success: false, error: "Failed to fetch delivery" };
  }
}

export async function postBulkDelivery(input: {
  orderId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
  date?: Date;

  description?: string;
  reduceInventory?: boolean;
  userId?: string;
}, tx?: Prisma.TransactionClient) {
  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
        const session = await auth();
        effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };

    const { orderId, items, date = new Date(), description, reduceInventory = false } = input;

    if (!items || items.length === 0) {
      return { success: false, error: "No items selected for delivery" };
    }

    const logic = async (itx: Prisma.TransactionClient) => {
      const results = [];

      for (const itemInput of items) {
        const { orderItemId, quantity } = itemInput;

        // 1. Fetch OrderItem and existing ledger entries
        const orderItem = await itx.orderItem.findUnique({
          where: { id: orderItemId },
          include: {
            DeliveryLedger: true,
          }
        });

        if (!orderItem) throw new Error(`Order item ${orderItemId} not found`);
        if (orderItem.orderId !== orderId) throw new Error(`Item ${orderItem.description} does not belong to this order`);

        const totalDelivered = orderItem.DeliveryLedger.reduce((sum, d) => sum + Number(d.quantity), 0);
        const remainingQty = Number(orderItem.quantity) - totalDelivered;

        // Validate
        if (quantity > 0 && quantity > remainingQty) {
          throw new Error(`Requested quantity (${quantity}) for "${orderItem.description}" exceeds remaining (${remainingQty})`);
        }

        // 2. Post to Ledger
        const entry = await itx.deliveryLedger.create({
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
             tx: itx,
             itemId: orderItem.itemId,
             quantity: -1 * Number(quantity), // OUT
             type: InventoryTransactionType.SALE,
             reference: entry.id,
             note: `Delivery for Order Item: ${orderItem.description}`,
             userId: effectiveUserId
           });
        }
        results.push(entry);
      }
      return results;
    };

    // Process in a transaction (either the provided one or a new one)
    const result = tx ? await logic(tx) : await prisma.$transaction(logic);

    // 4. Update Order Status
    const { updateOrderStatus } = await import("./orders");
    await updateOrderStatus(orderId, tx); // Ensure updateOrderStatus supports tx if we use it

    return { 
      success: true, 
      count: result.length, 
      deliveries: result 
    };
  } catch (error) {
    console.error("postBulkDelivery error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to post deliveries" };
  }
}
