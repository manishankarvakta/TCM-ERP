"use server";

import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma } from '@prisma/client';

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
        total: true, // Fetch total (subtotal)
        discount: true, // Fetch discount
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

    // Calculate robust total
    let orderTotalValue = Number(quotation.grandTotal || 0);
    if (orderTotalValue === 0 && quotation.total) {
       const subTotal = Number(quotation.total);
       const discount = Number(quotation.discount || 0);
       orderTotalValue = Math.max(0, subTotal - discount);
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
          totalValue: orderTotalValue,
          status: OrderStatus.PENDING,
        },
      });

      // Fetch all items belonging to this quotation
      // We traverse Section -> QuotationItem
      const sections = await tx.section.findMany({
        where: { quotationId },
        include: {
          QuotationItem: true,
          ItemGroup: { include: { QuotationItem: true } },
          CategoryGroup: { include: { QuotationItem: true } }
        }
      });

      // Flatten items
      const itemsToSnapshot: any[] = [];
      sections.forEach(section => {
        section.QuotationItem.forEach(item => itemsToSnapshot.push(item));
        section.ItemGroup.forEach(group => group.QuotationItem?.forEach(item => itemsToSnapshot.push(item)));
        section.CategoryGroup.forEach(cat => cat.QuotationItem?.forEach(item => itemsToSnapshot.push(item)));
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
export async function updateOrderStatus(orderId: string, tx?: Prisma.TransactionClient) {
  try {
    const client = tx || prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        OrderItem: {
          include: {
            DeliveryLedger: true,
            InvoiceItem: true,
          }
        },
        Voucher: {
            include: { VoucherLine: true }
        }
      }
    });

    if (!order) return { success: false, error: "Order not found" };

    // 1. Check Deliveries & Invoices per item
    let allDelivered = true;
    let allInvoiced = true;
    let anyActivity = false;

    for (const item of order.OrderItem) {
        const delivered = item.DeliveryLedger.reduce((sum: number, d) => sum + Number(d.quantity), 0);
        const invoiced = item.InvoiceItem.reduce((sum: number, i) => sum + Number(i.quantity), 0);
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
        order.Voucher.forEach((v: any) => {
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
        await client.order.update({
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
        OrderItem: {
          include: {
            DeliveryLedger: true,
            InvoiceItem: true,
          }
        },
        Voucher: {
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

    order.OrderItem.forEach(item => {
        const deliveredQty = item.DeliveryLedger.reduce((sum: number, d) => sum + Number(d.quantity), 0);
        const invoicedQty = item.InvoiceItem.reduce((sum: number, i) => sum + Number(i.quantity), 0);
        const unitPrice = Number(item.unitPrice);

        deliveredValue += deliveredQty * unitPrice;
        invoicedValue += invoicedQty * unitPrice;
    });

    // 2. Accounting Metrics (Voucher-based)
    let advanceReceived = 0;
    let advanceApplied = 0;
    let arBalance = 0; // Debits - Credits

    order.Voucher.forEach((v: any) => {
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
          Client: { 
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } }
            ]
          } 
        },
        {
            Quotation: {
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
        Client: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            image: true,
          }
        },
        Quotation: {
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

export async function getOrder(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true }
    });

    if (!order) return { success: false, error: "Order not found" };

    return { success: true, order };
  } catch (error) {
    console.error("Error fetching order:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}
