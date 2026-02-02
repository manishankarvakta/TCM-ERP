'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

/**
 * Generate unique order number
 * Format: ORD-YYYY-XXXX (e.g., ORD-2025-0001)
 */
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Create an order from an accepted quotation
 * This is called when quotation status is updated to ACCEPTED
 */
export async function createOrderFromQuotation(quotationId: string) {
  try {
    // 1. Fetch quotation data
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      select: {
        id: true,
        clientId: true,
        grandTotal: true,
        status: true,
      },
    });

    if (!quotation) {
      return { success: false, error: 'Quotation not found' };
    }

    if (quotation.status !== 'ACCEPTED') {
      return { success: false, error: 'Quotation must be ACCEPTED to create an order' };
    }

    // 2. Check for existing order (idempotency)
    const existingOrder = await prisma.order.findUnique({
      where: { quotationId },
    });

    if (existingOrder) {
      return { success: true, orderId: existingOrder.id, message: 'Order already exists' };
    }

    // 3. Generate order number
    const orderNumber = await generateOrderNumber();

    // 4. Create order and snapshot items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          quotationId,
          clientId: quotation.clientId,
          totalValue: quotation.grandTotal || 0,
          status: OrderStatus.PENDING,
        },
      });

      // Fetch all items belonging to this quotation
      // We traverse Section -> QuotationItem
      const sections = await tx.section.findMany({
        where: { quotationId },
        include: {
          items: true,
          groups: { include: { items: true } },
          categoryGroups: { include: { items: true } }
        }
      });

      // Flatten items
      const itemsToSnapshot: any[] = [];
      sections.forEach(section => {
        section.items.forEach(item => itemsToSnapshot.push(item));
        section.groups.forEach(group => group.items.forEach(item => itemsToSnapshot.push(item)));
        section.categoryGroups.forEach(cat => cat.items.forEach(item => itemsToSnapshot.push(item)));
      });

      // Create OrderItem snapshots
      if (itemsToSnapshot.length > 0) {
        await tx.orderItem.createMany({
          data: itemsToSnapshot.map(item => ({
            id: crypto.randomUUID(),
            orderId: newOrder.id,
            quotationItemId: item.id,
            itemId: item.itemId,
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            updatedAt: new Date()
          }))
        });
      }

      return newOrder;
    });

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Error in createOrderFromQuotation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create order' };
  }
}

/**
 * Update Order status based on delivery, invoicing, and payment progress
 * 
 * Completion Conditions:
 * 1. Sum(deliveredQty) == orderedQty (across all items)
 * 2. Sum(invoicedQty) == orderedQty (across all items)
 * 3. AR balance for order is cleared (<= 0)
 */
export async function updateOrderStatus(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            deliveries: true,
            invoiceItems: true,
          }
        },
        vouchers: {
            include: { VoucherLine: true }
        }
      }
    });

    if (!order) return { success: false, error: "Order not found" };

    // 1. Check Deliveries & Invoices per item
    let allDelivered = true;
    let allInvoiced = true;
    let anyActivity = false;

    for (const item of order.items) {
        const delivered = item.deliveries.reduce((sum: number, d) => sum + Number(d.quantity), 0);
        const invoiced = item.invoiceItems.reduce((sum: number, i) => sum + Number(i.quantity), 0);
        const ordered = Number(item.quantity);

        if (delivered < ordered) allDelivered = false;
        if (invoiced < ordered) allInvoiced = false;
        if (delivered > 0 || invoiced > 0) anyActivity = true;
    }

    // 2. Check AR Balance for this order
    const { findControlAccount } = await import("./accounting-helpers");
    const arAccountId = await findControlAccount("Accounts Receivable");
    
    let arBalance = 0;
    if (arAccountId) {
        order.vouchers.forEach((v: any) => {
            v.VoucherLine.forEach((line: any) => {
                if (line.chartOfAccountId === arAccountId) {
                    arBalance += Number(line.debitAmount) - Number(line.creditAmount);
                }
            });
        });
    }

    // 3. Determine New Status
    let newStatus: OrderStatus = order.status;

    if (allDelivered && allInvoiced && arBalance <= 0) {
        newStatus = OrderStatus.COMPLETED;
    } else if (allDelivered) {
        newStatus = OrderStatus.DELIVERED;
    } else if (anyActivity) {
        newStatus = OrderStatus.PROCESSING;
    }

    // 4. Update if changed
    if (newStatus !== order.status) {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: newStatus }
        });
        return { success: true, status: newStatus };
    }

    return { success: true, status: order.status };
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return { success: false, error: "Failed to update order status" };
  }
}

/**
 * Get a financial summary of an order for read-only display
 */
export async function getOrderFinancialSummary(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            deliveries: true,
            invoiceItems: true,
          }
        },
        vouchers: {
            where: { status: "posted" },
            include: { VoucherLine: true }
        }
      }
    });

    if (!order) return { success: false, error: "Order not found" };

    const { findControlAccount } = await import("./accounting-helpers");
    const arAccountId = await findControlAccount("Accounts Receivable");
    const advanceAccountId = await findControlAccount("Customer Advance");

    // 1. Fulfillment Metrics
    let deliveredValue = 0;
    let invoicedValue = 0;

    order.items.forEach(item => {
        const deliveredQty = item.deliveries.reduce((sum: number, d) => sum + Number(d.quantity), 0);
        const invoicedQty = item.invoiceItems.reduce((sum: number, i) => sum + Number(i.quantity), 0);
        const unitPrice = Number(item.unitPrice);

        deliveredValue += deliveredQty * unitPrice;
        invoicedValue += invoicedQty * unitPrice;
    });

    // 2. Accounting Metrics (Voucher-based)
    let advanceReceived = 0;
    let advanceApplied = 0;
    let arBalance = 0; // Debits - Credits

    order.vouchers.forEach((v: any) => {
        v.VoucherLine.forEach((line: any) => {
            if (advanceAccountId && line.chartOfAccountId === advanceAccountId) {
                advanceReceived += Number(line.creditAmount);
                advanceApplied += Number(line.debitAmount);
            }
            if (arAccountId && line.chartOfAccountId === arAccountId) {
                arBalance += Number(line.debitAmount) - Number(line.creditAmount);
            }
        });
    });

    return {
        success: true,
        summary: {
            orderValue: Number(order.totalValue),
            deliveredValue,
            invoicedValue,
            advanceReceived,
            advanceApplied,
            advanceRemaining: advanceReceived - advanceApplied,
            outstandingDue: arBalance,
            status: order.status
        }
    };

  } catch (error) {
    console.error("getOrderFinancialSummary error:", error);
    return { success: false, error: "Failed to fetch financial summary" };
  }
}

/**
 * Get paginated orders list
 */
export async function getOrders(
  page: number = 1, 
  limit: number = 10, 
  search: string = "", 
  tab: string = "all"
) {
  try {
    const skip = (page - 1) * limit;

    // Filter conditions
    const where: any = {};
    
    // Status filter from tabs
    if (tab && tab !== "all" && tab !== "trash") {
        where.status = tab.toUpperCase();
    }
    
    // Search filter
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { 
          client: { 
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } }
            ]
          } 
        },
        {
            quotation: {
                quotationNumber: { contains: search, mode: "insensitive" }
            }
        }
      ];
    }

    // Get total count
    const total = await prisma.order.count({ where });

    // Fetch data
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            image: true,
          }
        },
        quotation: {
            select: {
                quotationNumber: true
            }
        }
      }
    });

    return {
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { 
        success: false, 
        error: "Failed to fetch orders" 
    };
  }
}
