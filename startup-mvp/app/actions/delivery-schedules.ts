"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ScheduleItemInput {
  orderItemId: string;
  quantity: number;
}

/**
 * Creates a new delivery schedule for an order.
 * 
 * @param orderId - The target Order ID
 * @param data - The schedule header and items
 * @returns The created schedule object
 */
export async function createDeliverySchedule(
  orderId: string,
  data: {
    scheduledDate: Date;
    description?: string;
    items: ScheduleItemInput[];
  }
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the Order to ensure it exists
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          OrderItem: {
            include: {
              DeliveryLedger: true, // Only fetch DeliveryLedger for validation
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // 2. Validate items and prepare snapshots
      const scheduleItemsData = [];

      for (const inputItem of data.items) {
        const orderItem = order.OrderItem.find((item) => item.id === inputItem.orderItemId);

        if (!orderItem) {
          throw new Error(`Order Item ${inputItem.orderItemId} not found in this order.`);
        }

        // VALIDATION: Calculate remaining quantity using DeliveryLedger
        // remaining = ordered - delivered
        const deliveredQty = orderItem.DeliveryLedger.reduce(
          (sum: number, d: any) => sum + Number(d.quantity),
          0
        );
        const orderedQty = Number(orderItem.quantity);
        const remainingQty = orderedQty - deliveredQty;

        // Reject if: plannedQty > remainingQty
        if (inputItem.quantity > remainingQty) {
          throw new Error(
            `Planned quantity (${inputItem.quantity}) for "${orderItem.description}" exceeds remaining quantity (${remainingQty.toFixed(2)}).`
          );
        }

        // Prepare SNAPSHOT data
        scheduleItemsData.push({
          orderItemId: orderItem.id,
          description: orderItem.description,
          unitPrice: orderItem.unitPrice, // Snapshotted from OrderItem
          quantity: inputItem.quantity,
        });
      }

      // 3. Create the Schedule and its items
      const schedule = await (tx as any).deliverySchedule.create({
        data: {
          orderId: order.id,
          scheduledDate: data.scheduledDate,
          description: data.description,
          status: "scheduled",
          DeliveryScheduleItem: {
            create: scheduleItemsData,
          },
        },
        include: {
          DeliveryScheduleItem: true,
        },
      });

      // 4. Traceability: No changes to DeliveryLedger, Invoices, or Vouchers as per requirements

      revalidatePath(`/dashboard/quotations/orders/${orderId}`);
      
      const res = { success: true, schedule };
      console.log(`[DeliverySchedule] Created schedule ${schedule.id} for order ${orderId}`);
      return res;
    });
  } catch (error) {
    console.error("[DeliverySchedule] Error creating delivery schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Completes a delivery schedule by posting deliveries and generating a draft invoice.
 * 
 * @param scheduleId - The ID of the schedule to complete
 * @returns Success status and created records
 */
export async function completeDeliverySchedule(scheduleId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch the schedule with items
      const schedule = await (tx as any).deliverySchedule.findUnique({
        where: { id: scheduleId },
        include: {
          DeliveryScheduleItem: true,
          Order: true,
        },
      });

      if (!schedule) {
        throw new Error("Delivery Schedule not found");
      }

      // 2. Idempotency Guard
      if (schedule.status === "completed") {
        throw new Error("This schedule has already been completed.");
      }

      // 3. Prepare items for postBulkDelivery
      const deliveryItems = schedule.DeliveryScheduleItem.map((item: any) => ({
        orderItemId: item.orderItemId,
        quantity: Number(item.quantity),
      }));

      // 4. Call postBulkDelivery (Reusing existing engine)
      const { postBulkDelivery } = await import("./deliveries");
      const deliveryResult = await postBulkDelivery(
        {
          orderId: schedule.orderId,
          items: deliveryItems,
          date: new Date(),
          description: `Fulfillment of Schedule: ${schedule.description || scheduleId}`,
        },
        tx as any // Passing transaction client
      );

      if (!deliveryResult.success) {
        throw new Error(deliveryResult.error || "Failed to post delivery via engine.");
      }

      // 5. Generate DRAFT Invoice (Reusing existing engine)
      const { createInvoice } = await import("./invoices");
      
      // Match delivery ledger IDs to items
      // postBulkDelivery returns deliveries in the same order as input items
      const invoiceItems = (schedule.DeliveryScheduleItem as any[]).map((item: any, index: number) => {
        const ledgerEntry = (deliveryResult.deliveries as any[])[index];
        return {
          orderItemId: item.orderItemId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          deliveryLedgerId: ledgerEntry.id, // Linking to DeliveryLedger
        };
      });

      const invoiceResult = await createInvoice(
        {
          orderId: schedule.orderId,
          items: invoiceItems,
          date: new Date(),
        },
        tx as any // Passing transaction client
      );

      if (!invoiceResult.success) {
        throw new Error(invoiceResult.error || "Failed to generate draft invoice.");
      }

      // 6. Update Schedule Status
      const updatedSchedule = await tx.deliverySchedule.update({
        where: { id: scheduleId },
        data: { status: "completed" },
      });

      revalidatePath(`/dashboard/quotations/orders/${schedule.orderId}`);

      return {
        success: true,
        schedule: updatedSchedule,
        invoiceId: invoiceResult.invoiceId,
        deliveryCount: deliveryResult.count,
      };
    });
  } catch (error) {
    console.error("Error completing delivery schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Confirms a delivery schedule.
 */
export async function confirmDeliverySchedule(scheduleId: string) {
  try {
    const updated = await (prisma as any).deliverySchedule.update({
      where: { id: scheduleId },
      data: { status: "confirmed" },
    });

    revalidatePath(`/dashboard/quotations/delivery-schedule`);
    revalidatePath(`/dashboard/quotations/delivery-schedule/${scheduleId}`);

    return { success: true, schedule: updated };
  } catch (error) {
    return { success: false, error: "Failed to confirm schedule" };
  }
}

/**
 * Fetches paginated delivery schedules.
 */
export async function getDeliverySchedules(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all"
) {
  try {
    console.log(`[DeliverySchedule] Fetching schedules (page: ${page}, limit: ${limit}, status: ${status}, search: "${search}")`);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { Order: { orderNumber: { contains: search, mode: "insensitive" } } },
        { Order: { Client: { name: { contains: search, mode: "insensitive" } } } },
        { Order: { Client: { company: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, schedules] = await Promise.all([
      (prisma as any).deliverySchedule.count({ where }),
      (prisma as any).deliverySchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledDate: "desc" },
        include: {
          Order: {
            include: {
              Client: true,
            },
          },
          _count: {
            select: { DeliveryScheduleItem: true },
          },
        },
      }),
    ]);

    console.log(`[DeliverySchedule] Found ${total} schedules total`);
    return {
      success: true,
      schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("[DeliverySchedule] Error fetching schedules:", error);
    return { success: false, error: "Failed to fetch schedules" };
  }
}

/**
 * Fetches a single delivery schedule by ID.
 */
export async function getDeliverySchedule(id: string) {
  try {
    const schedule = await (prisma as any).deliverySchedule.findUnique({
      where: { id },
      include: {
        DeliveryScheduleItem: {
          include: {
            OrderItem: true,
          },
        },
        Order: {
          include: {
            Client: true,
          },
        },
      },
    });

    if (!schedule) throw new Error("Schedule not found");

    return { success: true, schedule };
  } catch (error) {
    return { success: false, error: "Failed to fetch schedule" };
  }
}
